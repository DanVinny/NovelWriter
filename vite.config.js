import { defineConfig } from 'vite';
import fs from 'fs';
import path from 'path';

export default defineConfig({
    plugins: [
        {
            name: 'auto-create-images-folder',
            configResolved(config) {
                const imagesDir = path.resolve(config.root, 'Images');
                if (!fs.existsSync(imagesDir)) {
                    fs.mkdirSync(imagesDir, { recursive: true });
                    console.log('[Vite] Created Images/ folder for mood art storage');
                }
            }
        }
    ]
});
