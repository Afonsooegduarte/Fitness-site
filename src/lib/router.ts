import { useEffect, useState } from 'react';

// Router mínimo baseado em hash (#/alunos/al_1?tab=planos). Funciona em ficheiro local e em qualquer servidor.
function read() {
  const h = window.location.hash.replace(/^#/, '') || '/';
  const [path, qs = ''] = h.split('?');
  return { path, parts: path.split('/').filter(Boolean), query: new URLSearchParams(qs) };
}

export type Route = ReturnType<typeof read>;

export function useRoute(): Route {
  const [route, setRoute] = useState(read);
  useEffect(() => {
    const on = () => setRoute(read());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}

export function navigate(to: string) {
  if (window.location.hash !== '#' + to) window.location.hash = to;
  document.querySelector('.main')?.scrollTo({ top: 0 });
}
