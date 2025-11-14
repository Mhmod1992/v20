import { defineConfig, loadEnv } from 'vite'

export default ({ mode }) => {
  // تحميل متغيرات البيئة من ملفات .env بناءً على 'mode'
  // معامل `''` الثالث يسمح بتحميل جميع المتغيرات بغض النظر عن بادئة VITE_
  const env = loadEnv(mode, process.cwd(), '');

  return defineConfig({
    server: {
      // السماح بالوصول من أي نطاق فرعي تابع لـ ngrok
      // هذا أفضل من إضافة الرابط المحدد في كل مرة لأنه يتغير
      allowedHosts: [
        '.ngrok-free.dev'
      ],
      // هذا الإعداد ضروري للسماح بالاتصالات الخارجية
      host: true
    }
  });
}