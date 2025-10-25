import { Link } from 'react-router-dom';

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <div className="max-w-5xl mx-auto px-4 py-16 text-center space-y-10">
        <header className="space-y-4">
          <p className="uppercase tracking-[0.5em] text-sm text-slate-400">Echo Park • Silver Lake • Joshua Tree</p>
          <h1 className="text-4xl md:text-6xl font-extrabold text-white">
            Rescue for every stranded ride.
          </h1>
          <p className="text-lg text-slate-300 max-w-3xl mx-auto">
            SupportCarr dispatches professional bike transport within minutes. Flatbeds, vans, and racks ready to get you and
            your wheels home safely.
          </p>
        </header>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/request"
            className="px-8 py-3 rounded-full bg-brand-500 hover:bg-brand-700 transition text-white font-semibold"
          >
            Get Help Now
          </Link>
          <Link
            to="/driver"
            className="px-8 py-3 rounded-full border border-slate-600 hover:bg-slate-800 transition text-white font-semibold"
          >
            Driver Dashboard
          </Link>
        </div>
        <section className="grid md:grid-cols-3 gap-6 text-left text-slate-300">
          {[
            { title: 'Guaranteed pickup', description: 'Contracted fleet coverage around Echo Park & Silver Lake.' },
            { title: 'Joshua Tree pilot', description: 'Weekend coverage for riders exploring the desert loops.' },
            { title: '8 minute goal', description: 'Under 20 minutes guaranteed, pushing for 8 minute averages.' }
          ].map((item) => (
            <article key={item.title} className="bg-slate-900/70 border border-slate-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white">{item.title}</h3>
              <p className="mt-2 text-sm">{item.description}</p>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
