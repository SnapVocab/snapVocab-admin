import './dom-setup';
import test, { after, afterEach } from 'node:test';
import { GlobalRegistrator } from '@happy-dom/global-registrator';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { ConfirmModal } from '../src/components/ui/ConfirmModal';

let root: Root | undefined;
afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  document.body.innerHTML = '';
});
after(() => GlobalRegistrator.unregister());

async function renderModal(element: React.ReactElement) {
  const host = document.body.appendChild(document.createElement('div'));
  root = createRoot(host);
  await act(async () => root!.render(element));
}

test('ConfirmModal renders nothing when isOpen is false', async () => {
  await renderModal(
    React.createElement(ConfirmModal, {
      isOpen: false,
      title: 'Xác nhận xóa',
      onClose: () => {},
      onConfirm: () => {},
    })
  );
  assert.equal(document.querySelector('[role="dialog"]'), null);
});

test('ConfirmModal renders dialog, title, description, and buttons when isOpen is true', async () => {
  let confirmed = false;
  let closed = false;

  await renderModal(
    React.createElement(
      ConfirmModal,
      {
        isOpen: true,
        tone: 'warning',
        title: 'Rời trang khi chưa lưu?',
        description: 'Trang hiện tại có thay đổi chưa lưu. Bạn có muốn tiếp tục?',
        confirmLabel: 'Rời trang',
        cancelLabel: 'Ở lại',
        onConfirm: () => { confirmed = true; },
        onClose: () => { closed = true; },
      },
      React.createElement('span', null, 'Mẹo: Nhấn Lưu trước khi rời')
    )
  );

  const dialog = document.querySelector('[role="dialog"]');
  assert.ok(dialog, 'dialog element should be present');
  assert.ok(document.body.textContent?.includes('Rời trang khi chưa lưu?'));
  assert.ok(document.body.textContent?.includes('Trang hiện tại có thay đổi chưa lưu.'));
  assert.ok(document.body.textContent?.includes('Mẹo: Nhấn Lưu trước khi rời'));

  const cancelButton = [...document.querySelectorAll('button')].find((b) => b.textContent?.includes('Ở lại'));
  assert.ok(cancelButton, 'Cancel button should exist');
  assert.equal(cancelButton?.getAttribute('data-autofocus'), 'true');

  const confirmButton = [...document.querySelectorAll('button')].find((b) => b.textContent?.includes('Rời trang'));
  assert.ok(confirmButton, 'Confirm button should exist');

  // Trigger confirm
  await act(async () => {
    confirmButton?.click();
  });
  assert.equal(confirmed, true);

  // Trigger cancel
  await act(async () => {
    cancelButton?.click();
  });
  assert.equal(closed, true);
});

test('ConfirmModal handles Escape key to dismiss', async () => {
  let closed = false;

  await renderModal(
    React.createElement(ConfirmModal, {
      isOpen: true,
      title: 'Hộp thoại kiểm tra',
      onClose: () => { closed = true; },
      onConfirm: () => {},
    })
  );

  await act(async () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
  });

  assert.equal(closed, true);
});

// TD-ADS-05: Shop dialogs are content inside the shared ConfirmModal.
test('Shop dialogs run on the shared ConfirmModal: busy label, locked buttons, error kept in the dialog', async () => {
  const { ArchiveConfirmationModal, PublishConfirmationModal } = await import('../src/features/shop/components/ShopModals');
  let closed = 0;
  await renderModal(React.createElement(ArchiveConfirmationModal, {
    isOpen: true, itemName: 'Khung Vàng', isArchiving: true, errorMessage: 'Mất kết nối',
    onClose: () => { closed++; }, onConfirm: () => {},
  }));
  const dialog = document.querySelector('[role="dialog"]')!;
  assert.ok(dialog.textContent!.includes('Ngừng bán vĩnh viễn'));
  assert.equal(dialog.querySelector('[role="alert"]')?.textContent, 'Mất kết nối');
  const buttons = [...dialog.querySelectorAll('button')];
  assert.ok(buttons.some(b => b.textContent?.includes('Đang ngừng bán…')), 'busy label on the confirm button');
  assert.ok(buttons.every(b => b.disabled), 'nothing clickable while archiving');
  await act(async () => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); });
  assert.equal(closed, 0, 'Esc does not close while busy');

  act(() => root?.unmount());
  document.body.innerHTML = '';
  await renderModal(React.createElement(PublishConfirmationModal, {
    isOpen: true, isPublishing: false, onClose: () => {}, onConfirm: () => {},
    item: { name: 'Bảo hiểm chuỗi', code: 'STREAK_FREEZE', type: 'STREAK_FREEZE', status: 'DRAFT', purchasable: true, price: 200, maxQuantity: 2 } as never,
  }));
  const text = document.querySelector('[role="dialog"]')!.textContent!;
  assert.ok(text.includes('Phát hành vật phẩm') && text.includes('STREAK_FREEZE') && text.includes('200 Coin'));
  assert.ok(text.includes('Giữ tối đa:') && text.includes('Xác nhận phát hành'));
});

test('useToast: a second toast restarts the timer instead of being cut short by the first', async () => {
  const { useToast } = await import('../src/components/ui/Toast');
  let show: (text: string, error?: boolean) => void = () => {};
  function Page() {
    const toast = useToast(80);
    show = toast.show;
    return React.createElement('div', null, toast.node);
  }
  const sleep = (ms: number) => act(() => new Promise(r => setTimeout(r, ms)));
  await renderModal(React.createElement(Page));
  await act(async () => show('Đã lưu.'));
  await sleep(50);
  await act(async () => show('Không lưu được.', true));
  await sleep(50); // 100 ms after the first toast: its timer would have closed the second one
  assert.equal(document.querySelector('[role="status"]')?.textContent, 'Không lưu được.');
  await sleep(60);
  assert.equal(document.querySelector('[role="status"]'), null);
});
