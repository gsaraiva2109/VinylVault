import React, { useState, useEffect } from 'react';
import './ScrollToTop.css';

const ScrollToTop: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const [animationClass, setAnimationClass] = useState('');

  useEffect(() => {
    const handleScroll = () => {
      // Pega o elemento do navbar/header
      const header = document.querySelector('.navbar');
      
      if (header) {
        const headerRect = header.getBoundingClientRect();
        // O botão só aparece quando nenhum pixel do header está visível
        // Isso significa que o bottom do header está acima do topo da viewport
        const headerFullyHidden = headerRect.bottom < 0;
        setIsVisible(headerFullyHidden);
      } else {
        // Fallback: se não encontrar o header, aparece após rolar 300px
        setIsVisible(window.scrollY > 300);
      }
    };

    // Adiciona o listener de scroll
    window.addEventListener('scroll', handleScroll);
    
    // Checa a posição inicial
    handleScroll();

    // Remove o listener quando o componente desmontar
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Controla a animação de entrada e saída
  useEffect(() => {
    if (isVisible) {
      // Mostra o botão
      setShouldRender(true);
      // Pequeno delay para garantir que o elemento foi renderizado
      setTimeout(() => {
        setAnimationClass('fade-in');
      }, 10);
    } else {
      // Inicia animação de saída
      setAnimationClass('fade-out');
      // Espera a animação terminar antes de remover o elemento do DOM
      const timer = setTimeout(() => {
        setShouldRender(false);
        setAnimationClass('');
      }, 400); // 400ms = duração da animação

      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  return (
    <>
      {shouldRender && (
        <button 
          className={`scroll-to-top-btn ${animationClass}`}
          onClick={scrollToTop} 
          aria-label="Scroll to top"
        >
          <svg height="1.2em" className="arrow" viewBox="0 0 512 512">
            <path d="M233.4 105.4c12.5-12.5 32.8-12.5 45.3 0l192 192c12.5 12.5 12.5 32.8 0 45.3s-32.8 12.5-45.3 0L256 173.3 86.6 342.6c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3l192-192z"></path>
          </svg>
          <p className="text">Back to Top</p>
        </button>
      )}
    </>
  );
};

export default ScrollToTop;
