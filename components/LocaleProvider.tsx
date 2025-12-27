"use client";

import { useEffect } from "react";
import useStore from "@/lib/store";

export default function LocaleProvider({ children }: { children: React.ReactNode }) {
    const language = useStore((state) => state.language);

    useEffect(() => {
        document.documentElement.lang = language;
        document.documentElement.dir = language === "he" ? "rtl" : "ltr";
    }, [language]);

    return <>{children}</>;
}
