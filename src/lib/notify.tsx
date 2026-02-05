import { toast } from "@/hooks/use-toast"
import { CheckCircle, XCircle, AlertTriangle, Info } from "lucide-react"

// Simple deduplication map to prevent spamming the same message
const recentToasts = new Set<string>();

const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info') => {
    const key = `${type}:${message}`;
    if (recentToasts.has(key)) return;

    // Add to cache
    recentToasts.add(key);
    // Clear after 2 seconds
    setTimeout(() => recentToasts.delete(key), 2000);

    const variants = {
        success: {
            className: "bg-green-50 border-green-200 text-green-900",
            title: "نجاح",
            icon: <CheckCircle className="w-5 h-5 text-green-600" />
        },
        error: {
            className: "bg-red-50 border-red-200 text-red-900",
            title: "خطأ",
            icon: <XCircle className="w-5 h-5 text-red-600" />
        },
        warning: {
            className: "bg-amber-50 border-amber-200 text-amber-900",
            title: "تنبيه",
            icon: <AlertTriangle className="w-5 h-5 text-amber-600" />
        },
        info: {
            className: "bg-blue-50 border-blue-200 text-blue-900",
            title: "معلومة",
            icon: <Info className="w-5 h-5 text-blue-600" />
        }
    }

    const variant = variants[type];

    toast({
        title: variant.title,
        description: message,
        className: `${variant.className} flex gap-3 items-center`,
        // Custom content can be achieved via action or description too, 
        // but styling the root toast is easier with shadcn
        variant: "default", // We use custom styles
    })
}

export const notify = {
    success: (msg: string) => showToast(msg, 'success'),
    error: (msg: string) => showToast(msg, 'error'),
    warning: (msg: string) => showToast(msg, 'warning'),
    info: (msg: string) => showToast(msg, 'info'),
}
