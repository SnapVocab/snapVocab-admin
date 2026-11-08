// Run once from Jenkins init.groovy.d on the Oracle controller.
import jenkins.model.Jenkins
import hudson.model.Cause
import hudson.plugins.git.GitSCM
import hudson.plugins.git.BranchSpec
import hudson.plugins.git.UserRemoteConfig
import org.jenkinsci.plugins.workflow.job.WorkflowJob
import org.jenkinsci.plugins.workflow.cps.CpsScmFlowDefinition
import org.jenkinsci.plugins.workflow.job.properties.PipelineTriggersJobProperty
import com.cloudbees.jenkins.GitHubPushTrigger
import com.cloudbees.plugins.credentials.SystemCredentialsProvider
import com.cloudbees.plugins.credentials.CredentialsScope
import com.cloudbees.plugins.credentials.domains.Domain
import org.jenkinsci.plugins.plaincredentials.impl.StringCredentialsImpl
import hudson.util.Secret
import org.jenkinsci.plugins.github.config.GitHubPluginConfig
import org.jenkinsci.plugins.github.config.HookSecretConfig

def j = Jenkins.get()
def jobName = 'snapvocab-admin-prod'
if (j.getItem(jobName) != null) throw new IllegalStateException('Admin job already exists; refusing to overwrite it')
def secretFile = new File(j.rootDir, 'cicd/admin-webhook-secret')
def secret = secretFile.getText('UTF-8').trim()
if (secret.length() < 32) throw new IllegalStateException('Missing webhook secret')
def credentialId = 'snapvocab-admin-webhook'
def store = SystemCredentialsProvider.getInstance().getStore()
store.addCredentials(Domain.global(), new StringCredentialsImpl(
    CredentialsScope.SYSTEM, credentialId, 'GitHub admin deployment webhook HMAC', Secret.fromString(secret)))
def github = j.getDescriptorByType(GitHubPluginConfig.class)
def configs = new ArrayList(github.getHookSecretConfigs() ?: [])
configs.add(new HookSecretConfig(credentialId, 'SHA256'))
github.setHookSecretConfigs(configs)
github.save()

def scm = new GitSCM(
    [new UserRemoteConfig('https://github.com/SnapVocab/snapVocab-admin.git', null, null, 'github-snapvocab')],
    [new BranchSpec('*/prod')], false, [], null, null, [])
def definition = new CpsScmFlowDefinition(scm, 'Jenkinsfile')
definition.setLightweight(true)
def job = j.createProject(WorkflowJob, jobName)
job.setDescription('Deploy admin.snapvocab.thanhthbm.online from prod via GitHub webhook. Pipeline managed in SCM.')
job.setDefinition(definition)
job.addProperty(new PipelineTriggersJobProperty([new GitHubPushTrigger()]))
job.save()
secretFile.delete()
def initFile = new File(j.rootDir, 'init.groovy.d/92-snapvocab-admin.groovy')
if (!initFile.renameTo(new File(initFile.path + '.applied'))) throw new IllegalStateException('Cannot mark bootstrap as applied')
job.scheduleBuild2(15, new Cause.RemoteCause('localhost', 'Initial authorized admin deployment'))
println('SNAPVOCAB_ADMIN: created prod job with SHA256 GitHub webhook verification')
