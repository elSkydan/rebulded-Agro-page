import { WORK_STEPS } from '@/lib/content';

export function HowWeWork() {
  return (
    <section id="how" className="py-16 sm:py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <span className="inline-block bg-gray-100 text-gray-600 text-sm font-medium px-4 py-1.5 rounded-full mb-4">
            Як ми працюємо
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">Просто і швидко</h2>
          <p className="text-gray-500">Від дзвінка до результату — один день</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {WORK_STEPS.map((step, index) => (
            <div key={step.title} className="text-center">
              <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <step.icon className="w-7 h-7 text-primary" aria-hidden="true" />
              </div>
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center mx-auto mb-3 -mt-2">
                <span className="text-white text-sm font-bold">{index + 1}</span>
              </div>
              <h3 className="font-bold text-gray-900 mb-2">{step.title}</h3>
              <p className="text-gray-500 text-sm">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
