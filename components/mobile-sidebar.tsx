'use client'
import { Menu } from "lucide-react";
import {Sheet,SheetContent,SheetTitle,SheetTrigger} from "@/components/ui/sheet";
import { Sidebar } from "./sidebar";
export const MobileSidebar = () => {
  return(
    <Sheet>
      <SheetTrigger>
        <Menu className="text-white" />
      </SheetTrigger>
      <SheetContent className="p-0 z-100" side="left">
         <SheetTitle></SheetTitle>
        <Sidebar />
      </SheetContent>
    </Sheet>
  );
};