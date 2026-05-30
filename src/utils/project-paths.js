import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const projectRoot = path.resolve(__dirname, '..', '..');

export function resolveFromRoot(...segments) {
  return path.resolve(projectRoot, ...segments);
}

export function resolveProjectPath(targetPath) {
  if (!targetPath) return projectRoot;
  return path.isAbsolute(targetPath) ? targetPath : resolveFromRoot(targetPath);
}

export function loadProjectEnv() {
  return dotenv.config({ path: resolveFromRoot('.env') });
}
