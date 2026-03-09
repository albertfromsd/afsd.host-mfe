import path from 'node:path';

const rootDir = process.cwd();

export const aliases = {
  '@': path.resolve(rootDir, 'src'),
  '@components': path.resolve(rootDir, 'src/components'),
  '@features': path.resolve(rootDir, 'src/features'),
  '@pages': path.resolve(rootDir, 'src/pages'),
  '@shared': path.resolve(rootDir, 'src/shared'),
};