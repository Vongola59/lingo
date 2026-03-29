import { Sidebar } from "@/components/sidebar";
import { MobileHeader } from "@/components/mobile-header";
type Props = {
  children: React.ReactNode;
}

const MainLayout = ({ children }: Props) => {
  return (
    <>
      <MobileHeader />
      <Sidebar className="hidden lg:flex" />
      <main className="lg:pl-64 h-full pt-12.5 lg:pt-0">
        <div className="max-w-264 mx-auto pt-6 h-full">
          {children}
        </div>
      </main>

    </>
  );
};

export default MainLayout;