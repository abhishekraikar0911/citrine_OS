import StationList from "@/components/station-list";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#020617] text-white selection:bg-indigo-500/30">
      {/* Hero Section */}
      <div className="relative overflow-hidden px-6 pt-24 pb-16 text-center lg:pt-32">
        <div className="absolute top-0 left-1/2 -z-10 h-[500px] w-[1000px] -translate-x-1/2 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-500/20 via-transparent to-transparent blur-3xl" />

        <h1 className="mb-6 text-5xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl">
          Charge <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Smarter</span>
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-indigo-200/60 sm:text-xl">
          Find, start, and monitor your EV charging sessions with ease. Purely modular, lightning fast.
        </p>
      </div>

      {/* Content Section */}
      <div className="mx-auto max-w-7xl px-6 pb-24">
        <div className="mb-12 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">Available Stations</h2>
          <button className="text-sm font-semibold text-indigo-400 hover:text-indigo-300">
            View all on map →
          </button>
        </div>

        <StationList />
      </div>
    </main>
  );
}
