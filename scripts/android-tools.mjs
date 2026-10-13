import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { spawn } from 'node:child_process';

export const root = process.cwd();
export const sdk = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT || join(process.env.LOCALAPPDATA || join(homedir(), 'AppData', 'Local'), 'Android', 'Sdk');
export const adb = existsSync(join(sdk, 'platform-tools', 'adb.exe')) ? join(sdk, 'platform-tools', 'adb.exe') : 'adb';
const studioJava = 'C:/Program Files/Android/Android Studio/jbr';
export const env = { ...process.env, ANDROID_HOME: sdk, ANDROID_SDK_ROOT: sdk };
const temurin = 'C:/Program Files/Eclipse Adoptium';
const jdk21 = existsSync(temurin) ? readdirSync(temurin).find(name => name.startsWith('jdk-21.')) : undefined;
if (!env.JAVA_HOME && jdk21) env.JAVA_HOME = join(temurin, jdk21);
if (!env.JAVA_HOME && existsSync(studioJava)) env.JAVA_HOME = studioJava;
export function run(command, args = [], { capture = false, cwd = root, extraEnv = {} } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, env: { ...env, ...extraEnv }, stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit', windowsHide: true });
    let output = '';
    if (capture) { child.stdout.on('data', d => output += d); child.stderr.on('data', d => output += d); }
    child.on('error', reject);
    child.on('exit', code => code === 0 ? resolve(output.trim()) : reject(new Error(`${command} exited ${code}${output ? '\n' + output.trim() : ''}`)));
  });
}
export const cap = (...args) => run(process.execPath, ['node_modules/@capacitor/cli/bin/capacitor', ...args]);
export const gradle = (...args) => process.platform === 'win32'
  ? run(env.JAVA_HOME ? join(env.JAVA_HOME, 'bin', 'java.exe') : 'java', ['-Xmx64m', '-classpath', 'gradle/wrapper/gradle-wrapper.jar', 'org.gradle.wrapper.GradleWrapperMain', ...args], { cwd: join(root, 'android') })
  : run('./gradlew', args, { cwd: join(root, 'android') });
