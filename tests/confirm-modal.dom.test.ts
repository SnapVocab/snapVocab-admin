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
