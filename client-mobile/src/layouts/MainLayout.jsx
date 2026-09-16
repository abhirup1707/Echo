import Navbar from "../components/layout/Navbar";
import Sidebar from "../components/layout/Sidebar";
import BottomPlayer from "../components/player/BottomPlayer";

function MainLayout({ children, currentSong }) {
  return (
    <>
      <Navbar />

      <div>
        <Sidebar />

        <main>
          {children}
        </main>
      </div>

      <BottomPlayer currentSong={currentSong} />
    </>
  );
}

export default MainLayout;