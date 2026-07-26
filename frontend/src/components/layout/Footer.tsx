import { siteConfig } from '@/lib/config';

export function Footer() {
  return (
    <footer className="bg-gray-900 py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
                <span className="text-white font-bold text-xs">МБ</span>
              </div>
              <span className="text-white font-semibold">{siteConfig.name}</span>
            </div>
            <p className="text-gray-400 text-sm">
              Вспашка, целина і покос — по всьому місту та за його межами
            </p>
          </div>
          <div className="flex flex-col sm:items-end gap-2">
            <a
              href={`tel:${siteConfig.phone}`}
              className="text-white font-semibold text-lg hover:text-primary transition-colors"
            >
              {siteConfig.phoneDisplay}
            </a>
            <p className="text-gray-500 text-sm">{siteConfig.workingHours}</p>
          </div>
        </div>
        <div className="border-t border-gray-800 mt-8 pt-6 text-center text-gray-600 text-xs">
          © {new Date().getFullYear()} {siteConfig.name}. Усі права захищені.
        </div>
      </div>
    </footer>
  );
}
