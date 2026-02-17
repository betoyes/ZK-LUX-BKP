import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

export function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookieConsent');
    if (consent === null) {
      // Add a small delay before showing
      const timer = setTimeout(() => setIsVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookieConsent', 'true');
    setIsVisible(false);
  };

  const handleReject = () => {
    localStorage.setItem('cookieConsent', 'false');
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.5, ease: "circOut" }}
          className="fixed bottom-4 left-0 right-0 z-50 p-4 md:p-6 flex justify-center pointer-events-none"
        >
          <div className="bg-background border border-border shadow-2xl p-6 md:p-8 w-full max-w-4xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pointer-events-auto">
            <div className="space-y-2 max-w-2xl">
              <h3 className="font-display text-lg">Sua Privacidade</h3>
              <p className="font-mono text-xs text-muted-foreground leading-relaxed">
                Utilizamos cookies para aprimorar sua experiência de navegação e analisar nosso tráfego. 
                Ao clicar em "Aceitar", você concorda com o uso de cookies conforme descrito em nossa 
                Política de Privacidade.
              </p>
            </div>
            
            <div className="flex gap-4 w-full md:w-auto">
              <Button 
                variant="outline" 
                onClick={handleReject}
                className="flex-1 md:flex-none rounded-none font-mono text-xs uppercase tracking-widest h-10"
              >
                Rejeitar
              </Button>
              <Button 
                onClick={handleAccept}
                className="flex-1 md:flex-none rounded-none bg-black text-white hover:bg-primary font-mono text-xs uppercase tracking-widest h-10"
              >
                Aceitar
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
