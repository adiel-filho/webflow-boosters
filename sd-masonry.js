(() => {
  const selectors = {
    MASONRY_LAYOUT_SELECTOR: "[sd-masonry]"
  };

  class Masonry {
    constructor(galleryElement, galleryItems) {
      this.galleryElement = galleryElement;
      this.galleryItems = Array.from(galleryItems);

      this.galleryClassName = "c-masonry-layout";
      this.columnClassName = "c-masonry-column";
      this.itemClassName = "c-masonry-item";

      // Verificar se deve usar balanceamento por altura
      this.useBalance = this.galleryElement.hasAttribute('sd-masonry-balance');

      // Extrair valores CSS de column-count e column-gap
      this.cssValues = this.extractCSSValues();
      this.columnCount = this.cssValues.columnCount;
      this.columnGap = this.cssValues.columnGap;

      this.galleryStyles = {
        display: "flex",
        "flex-wrap": "wrap",
        "justify-content": "flex-start"
      };

      this.generate(this.columnCount);
      this.handleResponsive();
      this.handleImages(); // Re-layout quando imagens carregam
    }

    extractCSSValues() {
      const computedStyle = window.getComputedStyle(this.galleryElement);
      const columnCount = computedStyle.columnCount;
      const columnGap = computedStyle.columnGap;
      
      // Fallbacks para quando CSS não está definido
      let finalColumnCount;
      if (columnCount === 'auto') {
        finalColumnCount = this.calculateAutoColumns();
      } else if (columnCount === 'none' || columnCount === 'inherit') {
        // Se não há CSS definido, usar padrão de 3 colunas
        finalColumnCount = 3;
      } else {
        const parsed = parseInt(columnCount, 10);
        finalColumnCount = isNaN(parsed) ? 3 : Math.max(parsed, 1);
      }
      
      const finalColumnGap = parseFloat(columnGap) || 20; // Padrão de 20px se não definido
      
      return {
        columnCount: finalColumnCount,
        columnGap: finalColumnGap
      };
    }

    calculateAutoColumns() {
      // Para column-count: auto, calcular baseado na largura disponível
      // Assumir largura mínima de coluna de 200px se não especificado
      const containerWidth = this.galleryElement.offsetWidth;
      const minColumnWidth = 200;
      return Math.floor(containerWidth / minColumnWidth) || 1;
    }

    generate(count) {
      const cols = [];
      this.galleryElement.classList.add(this.galleryClassName);
      Object.assign(this.galleryElement.style, this.galleryStyles);
      
      // Aplicar gap usando o valor do CSS
      if (this.columnGap > 0) {
        this.galleryElement.style.gap = `${this.columnGap}px`;
      }

      // create columns
      for (let i = 1; i <= count; i++) {
        const col = document.createElement("div");
        col.classList.add(this.columnClassName, `column-${i}`);
        col.style.flex = "1";
        col.style.minWidth = "0"; // Permitir flexibilidade total
        this.galleryElement.append(col);
        cols.push(col);
      }

      // Distribuir itens baseado no modo selecionado
      if (this.useBalance) {
        this.distributeItemsIntelligently(cols);
      } else {
        this.distributeItemsSequentially(cols);
      }
    }

    distributeItemsSequentially(cols) {
      // Distribuição sequencial: coluna 1, item 1; coluna 2, item 2; coluna 3, item 3; coluna 1, item 4...
      this.galleryItems.forEach((item, index) => {
        const columnIndex = index % cols.length;
        const targetColumn = cols[columnIndex];
        
        // Adicionar item à coluna
        targetColumn.append(item);
        item.classList.add(this.itemClassName);
        
        // Aplicar gap vertical se especificado
        if (this.columnGap > 0) {
          item.style.marginBottom = `${this.columnGap}px`;
        }
      });
    }

    distributeItemsIntelligently(cols) {
      // Inicializar alturas das colunas
      const columnHeights = new Array(cols.length).fill(0);
      
      // Distribuir cada item na coluna com menor altura
      this.galleryItems.forEach(item => {
        // Encontrar a coluna com menor altura
        const shortestColumnIndex = columnHeights.indexOf(Math.min(...columnHeights));
        const shortestColumn = cols[shortestColumnIndex];
        
        // Adicionar item à coluna
        shortestColumn.append(item);
        item.classList.add(this.itemClassName);
        
        // Aplicar gap vertical se especificado
        if (this.columnGap > 0) {
          item.style.marginBottom = `${this.columnGap}px`;
        }
        
        // Calcular nova altura da coluna (incluindo o item adicionado)
        columnHeights[shortestColumnIndex] += item.offsetHeight;
        
        // Se há gap, adicionar ao cálculo da altura
        if (this.columnGap > 0) {
          columnHeights[shortestColumnIndex] += this.columnGap;
        }
      });
    }

    handleResponsive() {
      // simple micro-throttle
      let raf = null;
      const onResize = () => {
        if (raf) return;
        raf = requestAnimationFrame(() => {
          raf = null;
          
          // Re-extrair valores CSS para verificar mudanças
          const newCSSValues = this.extractCSSValues();
          const newColumnCount = newCSSValues.columnCount;
          const newColumnGap   = newCSSValues.columnGap;

          if (newColumnCount !== this.columnCount || newColumnGap !== this.columnGap) {
            this.columnCount = newColumnCount;
            this.columnGap = newColumnGap;

            // Limpar colunas existentes
            this.galleryElement.querySelectorAll(`.${this.columnClassName}`).forEach(el => el.remove());

            // Re-gerar com novos valores
            this.generate(this.columnCount);
          }
        });
      };
      window.addEventListener("resize", onResize);
    }

    // Re-layout quando imagens carregam, pois alturas mudam
    handleImages() {
      this.galleryItems.forEach(node => {
        node.querySelectorAll?.("img").forEach(img => {
          if (!img.complete) img.addEventListener("load", () => {
            const newVals = this.extractCSSValues();
            const gapChanged = newVals.columnGap !== this.columnGap;
            const colsChanged = newVals.columnCount !== this.columnCount;

            if (gapChanged || colsChanged) {
              this.columnGap = newVals.columnGap;
              this.columnCount = newVals.columnCount;
              this.galleryElement.querySelectorAll(`.${this.columnClassName}`).forEach(el => el.remove());
              this.generate(this.columnCount);
            } else {
              // Só forçar redistribuição mantendo config atual
              this.galleryElement.querySelectorAll(`.${this.columnClassName}`).forEach(el => el.remove());
              this.generate(this.columnCount);
            }
          }, { once: true });
        });
      });

      // Também garantir após o load da página
      window.addEventListener("load", () => {
        this.galleryElement.querySelectorAll(`.${this.columnClassName}`).forEach(el => el.remove());
        this.generate(this.columnCount);
      }, { once: true });
    }
  }

  // Aguardar o DOM estar pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeMasonry);
  } else {
    initializeMasonry();
  }

  function initializeMasonry() {
    document.querySelectorAll(selectors.MASONRY_LAYOUT_SELECTOR).forEach((el) => {
      // Evita dupla inicialização (ex.: observer + bootstrap)
      if (el.dataset.masonryInited === "1") return;

      const kids = el.querySelectorAll(":scope > *");
      
      // Sempre inicializar elementos com sd-masonry (com fallbacks se CSS não estiver definido)
      new Masonry(el, kids);
      el.dataset.masonryInited = "1";
    });
  }

  // Observer para novos elementos adicionados dinamicamente
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType !== 1) return; // Element node

        if (node.matches && node.matches(selectors.MASONRY_LAYOUT_SELECTOR)) {
          if (node.dataset.masonryInited !== "1") {
            const kids = node.querySelectorAll(":scope > *");
            new Masonry(node, kids);
            node.dataset.masonryInited = "1";
          }
        }

        const newMasonryElements = node.querySelectorAll?.(selectors.MASONRY_LAYOUT_SELECTOR);
        newMasonryElements && newMasonryElements.forEach((el) => {
          if (el.dataset.masonryInited === "1") return;
          const kids = el.querySelectorAll(":scope > *");
          new Masonry(el, kids);
          el.dataset.masonryInited = "1";
        });
      });
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
})();