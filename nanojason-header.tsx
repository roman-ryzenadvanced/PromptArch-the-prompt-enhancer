'use client'

import Link from "next/link"
import { Sparkles, Github, FileText, Home } from "lucide-react"
import { Button } from "@/components/ui/button"

export const Header = () => {
    return (
        <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-md">
            <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Sparkles className="h-6 w-6 text-blue-600" />
                    <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
                        NanoJason
                    </span>
                </div>

                <nav className="flex items-center gap-4 lg:gap-6">
                    <a
                        href="https://www.rommark.dev"
                        className="text-gray-600 hover:text-blue-600 transition-colors font-medium flex items-center gap-1"
                    >
                        <Home className="h-4 w-4" />
                        Home
                    </a>
                    <a
                        href="https://github.rommark.dev/admin/NanoJasonPro?tab=readme-ov-file"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-600 hover:text-blue-600 transition-colors font-medium flex items-center gap-1"
                    >
                        <Github className="h-4 w-4" />
                        GitHub
                    </a>
                    <a
                        href="https://jasonformat.org/docs"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-600 hover:text-blue-600 transition-colors font-medium flex items-center gap-1"
                    >
                        <FileText className="h-4 w-4" />
                        Docs
                    </a>
                    <Button
                        asChild
                        variant="outline"
                        size="sm"
                    >
                        <Link href="/">
                            Get Started
                        </Link>
                    </Button>
                </nav>
            </div>
        </header>
    )
}
