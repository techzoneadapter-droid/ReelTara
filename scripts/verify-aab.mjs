import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const bundle = process.argv[2];
const bundletool = process.env.BUNDLETOOL_JAR;
if (!bundle || !bundletool) throw Error('Usage: BUNDLETOOL_JAR=... node scripts/verify-aab.mjs signed.aab');
const javaTool = name => process.env.JAVA_HOME ? join(process.env.JAVA_HOME, 'bin', name + (process.platform === 'win32' ? '.exe' : '')) : name;
const run = (name, args) => execFileSync(javaTool(name), args, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, env: { ...process.env, JAVA_TOOL_OPTIONS: '-Duser.language=en -Duser.country=US' } });
const verified = run('jarsigner', ['-verify', '-verbose', '-certs', bundle]);
if (!/jar verified\./.test(verified) || /jar is unsigned|unsigned entries|treated as unsigned/i.test(verified)) throw Error('AAB is unsigned, partially signed or has an invalid signature');
run('java', ['-jar', bundletool, 'validate', '--bundle=' + bundle]);
const manifest = run('java', ['-jar', bundletool, 'dump', 'manifest', '--bundle=' + bundle]);
const applicationId = manifest.match(/<manifest\b[^>]*\bpackage="([^"]+)"/s)?.[1];
const targetSdk = Number(manifest.match(/android:targetSdkVersion="(\d+)"/)?.[1]);
const versionCode = Number(manifest.match(/android:versionCode="(\d+)"/)?.[1]);
const debuggable = manifest.match(/android:debuggable="([^"]+)"/)?.[1] || 'false';
if (applicationId !== 'vn.com.nvbtech.reeltara' || targetSdk !== 36 || !Number.isInteger(versionCode) || versionCode < 1 || debuggable === 'true') throw Error('Invalid release package, SDK, version or debug flag');
if (process.env.GITHUB_RUN_NUMBER && versionCode !== Number(process.env.GITHUB_RUN_NUMBER)) throw Error('AAB versionCode differs from workflow run number');
const entries = run('jar', ['tf', bundle]).split(/\r?\n/);
const report = { checkedAt: new Date().toISOString(), signed: true, applicationId, targetSdk, versionCode, debuggable: false,
  sha256: createHash('sha256').update(readFileSync(bundle)).digest('hex'),
  nativeLibraries: entries.filter(p => p.endsWith('.so')), commit: process.env.GITHUB_SHA || null };
mkdirSync('release-evidence', { recursive: true });
writeFileSync('release-evidence/aab-verification.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
