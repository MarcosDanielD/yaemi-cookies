/**
 * YAEMI COOKIES E DOCES ARTESANAIS — INTERACTIVE APPLICATION SCRIPT
 * Handles video playback, custom box builder, cart drawer, modals, filters & WhatsApp order dispatch.
 */

// Se tiver o número de WhatsApp (DDD + Número), coloque aqui (ex: "5541999999999"). Vazio abre o WhatsApp para escolher o contato.
const YAEMI_WHATSAPP_PHONE = "";

function openWhatsApp(message) {
  const encoded = encodeURIComponent(message);
  const url = YAEMI_WHATSAPP_PHONE 
    ? `https://api.whatsapp.com/send?phone=${YAEMI_WHATSAPP_PHONE}&text=${encoded}`
    : `https://api.whatsapp.com/send?text=${encoded}`;
  window.open(url, '_blank');
}

document.addEventListener('DOMContentLoaded', () => {

  /* ==========================================================================
     1. VIDEO PLAYER CONTROLS
     ========================================================================== */
  const video = document.getElementById('cookieVideo');
  const playToggleBtn = document.getElementById('playToggleBtn');
  const playIcon = document.getElementById('playIcon');
  const pauseIcon = document.getElementById('pauseIcon');
  const soundToggleBtn = document.getElementById('soundToggleBtn');
  const soundOffIcon = document.getElementById('soundOffIcon');
  const soundOnIcon = document.getElementById('soundOnIcon');
  const fullscreenBtn = document.getElementById('fullscreenBtn');

  if (video && playToggleBtn) {
    // Attempt muted autoplay on first interaction or scroll
    video.muted = true;
    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise.then(() => {
        playIcon.classList.add('hidden');
        pauseIcon.classList.remove('hidden');
      }).catch(() => {
        // Autoplay prevented by browser policy, keep play button visible
        playIcon.classList.remove('hidden');
        pauseIcon.classList.add('hidden');
      });
    }

    playToggleBtn.addEventListener('click', () => {
      if (video.paused) {
        video.play();
        playIcon.classList.add('hidden');
        pauseIcon.classList.remove('hidden');
      } else {
        video.pause();
        playIcon.classList.remove('hidden');
        pauseIcon.classList.add('hidden');
      }
    });

    video.addEventListener('click', () => {
      playToggleBtn.click();
    });

    // Sound toggle
    if (soundToggleBtn) {
      soundToggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        video.muted = !video.muted;
        if (video.muted) {
          soundOffIcon.classList.remove('hidden');
          soundOnIcon.classList.add('hidden');
        } else {
          soundOffIcon.classList.add('hidden');
          soundOnIcon.classList.remove('hidden');
        }
      });
    }

    // Fullscreen toggle
    if (fullscreenBtn) {
      fullscreenBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!document.fullscreenElement) {
          if (video.requestFullscreen) video.requestFullscreen();
          else if (video.webkitRequestFullscreen) video.webkitRequestFullscreen();
        } else {
          if (document.exitFullscreen) document.exitFullscreen();
        }
      });
    }
  }

  /* ==========================================================================
     2. MENU FILTER TABS (SILKY SMOOTH 60FPS TRANSITION)
     ========================================================================== */
  const filterTabs = document.querySelectorAll('.filter-tab');
  const recipeCards = document.querySelectorAll('.recipe-card');
  let isFiltering = false;

  filterTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      if (tab.classList.contains('active') || isFiltering) return;

      filterTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const filterValue = tab.getAttribute('data-filter');
      isFiltering = true;

      // 1. Inicia o fade-out suave nos cartões que vão sumir
      recipeCards.forEach(card => {
        const cardCategory = card.getAttribute('data-category');
        const shouldShow = (filterValue === 'all' || cardCategory === filterValue);

        if (!shouldShow) {
          card.classList.add('filter-animating');
        }
      });

      // 2. Após 120ms troca o display sem travamento e faz fade-in suave nos novos
      setTimeout(() => {
        recipeCards.forEach(card => {
          const cardCategory = card.getAttribute('data-category');
          const shouldShow = (filterValue === 'all' || cardCategory === filterValue);

          if (shouldShow) {
            card.classList.remove('filter-hidden');
            card.classList.add('filter-animating');
          } else {
            card.classList.add('filter-hidden');
            card.classList.remove('filter-animating');
          }
        });

        // Aguarda frame para ativar a transição fluida
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            recipeCards.forEach(card => {
              if (!card.classList.contains('filter-hidden')) {
                card.classList.remove('filter-animating');
              }
            });
            isFiltering = false;
          });
        });
      }, 120);
    });
  });

  /* ==========================================================================
     3. INTERACTIVE BOX BUILDER & WHATSAPP GENERATOR
     ========================================================================== */
  const boxSizeCards = document.querySelectorAll('.box-size-card');
  const flavorRows = document.querySelectorAll('.builder-flavor-row');
  const maxSlotsText = document.getElementById('maxSlotsText');
  const currentSelectedText = document.getElementById('currentSelectedText');
  const slotsBarFill = document.getElementById('slotsBarFill');
  const summaryBoxTitle = document.getElementById('summaryBoxTitle');
  const summaryItemsList = document.getElementById('summaryItemsList');
  const summarySubtotal = document.getElementById('summarySubtotal');
  const summaryDiscount = document.getElementById('summaryDiscount');
  const discountLineRow = document.getElementById('discountLineRow');
  const summaryTotal = document.getElementById('summaryTotal');
  const btnSendWhatsapp = document.getElementById('btnSendWhatsapp');
  const custNameInput = document.getElementById('custName');
  const custAddressInput = document.getElementById('custAddress');
  const custNotesInput = document.getElementById('custNotes');

  let currentCapacity = 2;
  let currentBoxName = "Caixa Dupla (2 Cookies)";
  let currentDiscount = 0;
  const selectedFlavors = {
    "Tradicional": { qty: 0, price: 15.00 },
    "Nutella": { qty: 0, price: 19.00 },
    "Red Velvet": { qty: 0, price: 21.00 }
  };

  // Change Box Size
  boxSizeCards.forEach(card => {
    card.addEventListener('click', () => {
      boxSizeCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');

      currentCapacity = parseInt(card.getAttribute('data-capacity'), 10);
      currentBoxName = card.getAttribute('data-box-name');
      currentDiscount = parseFloat(card.getAttribute('data-discount')) || 0;

      summaryBoxTitle.textContent = currentBoxName;
      maxSlotsText.textContent = currentCapacity;

      // Ensure total selected doesn't exceed new capacity
      let totalQty = getTotalSelectedCookies();
      if (totalQty > currentCapacity) {
        resetFlavorCounts();
      }

      updateBuilderUI();
    });
  });

  function getTotalSelectedCookies() {
    return Object.values(selectedFlavors).reduce((acc, item) => acc + item.qty, 0);
  }

  function resetFlavorCounts() {
    for (const key in selectedFlavors) {
      selectedFlavors[key].qty = 0;
    }
    flavorRows.forEach(row => {
      const display = row.querySelector('.qty-display');
      if (display) display.textContent = '0';
    });
  }

  // Handle + and - buttons
  flavorRows.forEach(row => {
    const flavorName = row.getAttribute('data-flavor');
    const price = parseFloat(row.getAttribute('data-price'));
    const btnMinus = row.querySelector('.btn-minus');
    const btnPlus = row.querySelector('.btn-plus');
    const qtyDisplay = row.querySelector('.qty-display');

    if (!selectedFlavors[flavorName]) {
      selectedFlavors[flavorName] = { qty: 0, price: price };
    }

    btnPlus.addEventListener('click', () => {
      const totalCurrently = getTotalSelectedCookies();
      if (totalCurrently >= currentCapacity) {
        showTemporaryNotice(`Sua caixa comporta no máximo ${currentCapacity} cookies. Para pedir mais, selecione a caixa de 4 ou 6 unidades acima!`);
        return;
      }
      selectedFlavors[flavorName].qty += 1;
      qtyDisplay.textContent = selectedFlavors[flavorName].qty;
      qtyDisplay.classList.remove('badge-bounce');
      void qtyDisplay.offsetWidth;
      qtyDisplay.classList.add('badge-bounce');
      updateBuilderUI();
    });

    btnMinus.addEventListener('click', () => {
      if (selectedFlavors[flavorName].qty > 0) {
        selectedFlavors[flavorName].qty -= 1;
        qtyDisplay.textContent = selectedFlavors[flavorName].qty;
        qtyDisplay.classList.remove('badge-bounce');
        void qtyDisplay.offsetWidth;
        qtyDisplay.classList.add('badge-bounce');
        updateBuilderUI();
      }
    });
  });

  function showTemporaryNotice(msg) {
    alert(msg);
  }

  function updateBuilderUI() {
    const totalQty = getTotalSelectedCookies();
    currentSelectedText.textContent = totalQty;

    // Update progress bar
    const percent = Math.min(100, Math.round((totalQty / currentCapacity) * 100));
    slotsBarFill.style.width = `${percent}%`;

    // Render summary items
    let subtotal = 0;
    let itemsHTML = '';

    for (const [name, data] of Object.entries(selectedFlavors)) {
      if (data.qty > 0) {
        const itemCost = data.qty * data.price;
        subtotal += itemCost;
        itemsHTML += `
          <div class="summary-item-line">
            <span><strong>${data.qty}x</strong> ${name}</span>
            <span>R$ ${itemCost.toFixed(2).replace('.', ',')}</span>
          </div>
        `;
      }
    }

    if (totalQty === 0) {
      summaryItemsList.innerHTML = `
        <p class="empty-state-text">Nenhum cookie selecionado ainda.<br>Clique no <strong>+</strong> ao lado dos sabores para preencher sua caixa!</p>
      `;
      btnSendWhatsapp.disabled = true;
    } else {
      summaryItemsList.innerHTML = itemsHTML;
      // Allow sending once at least 1 item is chosen, or recommend completing box
      btnSendWhatsapp.disabled = false;
    }

    // Pricing
    summarySubtotal.textContent = `R$ ${subtotal.toFixed(2).replace('.', ',')}`;

    if (currentDiscount > 0 && totalQty >= currentCapacity) {
      discountLineRow.style.display = 'flex';
      summaryDiscount.textContent = `- R$ ${currentDiscount.toFixed(2).replace('.', ',')}`;
    } else {
      discountLineRow.style.display = 'none';
    }

    const finalTotal = Math.max(0, subtotal - (totalQty >= currentCapacity ? currentDiscount : 0));
    summaryTotal.textContent = `R$ ${finalTotal.toFixed(2).replace('.', ',')}`;
  }

  // Dispatch WhatsApp Order
  if (btnSendWhatsapp) {
    btnSendWhatsapp.addEventListener('click', () => {
      const totalQty = getTotalSelectedCookies();
      if (totalQty === 0) {
        alert('Por favor, selecione ao menos 1 cookie para montar seu pedido!');
        return;
      }

      const clientName = custNameInput.value.trim() || 'Cliente';
      const clientAddress = custAddressInput.value.trim() || 'A combinar / Retirada';
      const clientNotes = custNotesInput.value.trim() || 'Nenhuma';

      let itemsText = '';
      for (const [name, data] of Object.entries(selectedFlavors)) {
        if (data.qty > 0) {
          itemsText += `• ${data.qty}x ${name} (R$ ${(data.qty * data.price).toFixed(2).replace('.', ',')})\n`;
        }
      }

      const totalVal = summaryTotal.textContent;

      const message = 
`🍪 *PEDIDO YAEMI COOKIES E DOCES ARTESANAIS* 🍪
----------------------------------------------
📦 *Embalagem:* ${currentBoxName}
${itemsText}
👤 *Nome:* ${clientName}
📍 *Endereço/Bairro:* ${clientAddress}
📝 *Observações:* ${clientNotes}

💰 *TOTAL DO PEDIDO:* ${totalVal}
----------------------------------------------
Olá Yaemi Doces! Gostaria de confirmar esse pedido da fornada de hoje. Como posso efetuar o pagamento via Pix?`;

      openWhatsApp(message);
    });
  }

  /* ==========================================================================
     4. QUICK VIEW MODAL
     ========================================================================== */
  const modalBackdrop = document.getElementById('flavorModalBackdrop');
  const modalCloseBtn = document.getElementById('modalCloseBtn');
  const quickViewBtns = document.querySelectorAll('.btn-quick-view');
  const miniTeaser = document.getElementById('miniTeaser');

  const modalImg = document.getElementById('modalImg');
  const modalTitle = document.getElementById('modalTitle');
  const modalScript = document.getElementById('modalScript');
  const modalDesc = document.getElementById('modalDesc');
  const modalPrice = document.getElementById('modalPrice');
  const modalAddCartBtn = document.getElementById('modalAddCartBtn');

  const cookieData = {
    "modal-cookie-tradicional": {
      title: "Tradicional",
      script: "“O clássico artesanal coberto de gotas de chocolate.”",
      desc: "Massa amanteigada dourada com generosas gotas de chocolate ao leite e meio amargo. Borda crocante e interior macio.",
      price: "R$ 15,00",
      numericPrice: 15.00,
      img: "assets/cookie-tradicional.jpg"
    },
    "modal-cookie-nutella": {
      title: "Nutella",
      script: "“O queridinho da Yaemi: muito recheio cremoso de avelã.”",
      desc: "Massa amanteigada com gotas de chocolate, recheio farto de Nutella e polvilhado delicadamente com açúcar de confeiteiro.",
      price: "R$ 19,00",
      numericPrice: 19.00,
      img: "assets/cookie-nutella.jpg"
    },
    "modal-cookie-red-velvet": {
      title: "Red Velvet",
      script: "“Massa aveludada com pedaços e cobertura de chocolate branco.”",
      desc: "Autêntico cookie Red Velvet com textura macia, gotas de chocolate branco nobre e finalizado com cascata cremosa.",
      price: "R$ 21,00",
      numericPrice: 21.00,
      img: "assets/cookie-red-velvet.jpg"
    },
    "modal-cookie-box-4": {
      title: "Box Yaemi (4x)",
      script: "“A seleção dos seus cookies preferidos em caixa presenteável.”",
      desc: "Caixa com 4 cookies à sua escolha (Tradicional, Nutella ou Red Velvet). Embalagem especial perfeita para presentear ou saborear.",
      price: "R$ 72,00",
      numericPrice: 72.00,
      img: "assets/cookie-gotas-box.jpg"
    },
    "modal-doces-encomenda": {
      title: "Brigadeiros Gourmet & Bolos Caseiros",
      script: "“Doces artesanais sob encomenda para festas e momentos especiais.”",
      desc: "Feitos sob medida com os melhores ingredientes: brigadeiros gourmet enrolados na hora e bolos caseiros fofinhos e recheados.",
      price: "Sob consulta",
      numericPrice: 0.00,
      img: "assets/logo-yaemi.png"
    }
  };

  let activeModalCookie = null;

  function openModal(id) {
    const data = cookieData[id] || cookieData["modal-cookie-tradicional"];
    activeModalCookie = data;
    modalImg.src = data.img;
    modalTitle.textContent = data.title;
    modalScript.textContent = data.script;
    modalDesc.textContent = data.desc;
    modalPrice.textContent = data.price;
    modalBackdrop.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    modalBackdrop.classList.remove('open');
    document.body.style.overflow = '';
  }

  quickViewBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const modalId = btn.getAttribute('data-modal');
      openModal(modalId);
    });
  });

  if (miniTeaser) {
    miniTeaser.addEventListener('click', () => {
      openModal('modal-cookie-red-velvet');
    });
  }

  if (modalCloseBtn) {
    modalCloseBtn.addEventListener('click', closeModal);
  }

  if (modalBackdrop) {
    modalBackdrop.addEventListener('click', (e) => {
      if (e.target === modalBackdrop) closeModal();
    });
  }

  if (modalAddCartBtn) {
    modalAddCartBtn.addEventListener('click', () => {
      if (activeModalCookie) {
        addToCart(activeModalCookie.title, activeModalCookie.numericPrice, activeModalCookie.img);
        closeModal();
      }
    });
  }

  /* ==========================================================================
     5. CART DRAWER & INSTANT ORDER
     ========================================================================== */
  const cartDrawerBackdrop = document.getElementById('cartDrawerBackdrop');
  const openCartBtn = document.getElementById('openCartBtn');
  const closeCartDrawerBtn = document.getElementById('closeCartDrawerBtn');
  const cartDrawerItems = document.getElementById('cartDrawerItems');
  const cartCountBadge = document.getElementById('cartCountBadge');
  const cartDrawerCount = document.getElementById('cartDrawerCount');
  const drawerTotalValue = document.getElementById('drawerTotalValue');
  const btnCheckoutDrawer = document.getElementById('btnCheckoutDrawer');
  const addCartBtns = document.querySelectorAll('.btn-add-cart');

  let cart = [];

  function openCart() {
    cartDrawerBackdrop.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeCart() {
    cartDrawerBackdrop.classList.remove('open');
    document.body.style.overflow = '';
  }

  if (openCartBtn) openCartBtn.addEventListener('click', openCart);
  if (closeCartDrawerBtn) closeCartDrawerBtn.addEventListener('click', closeCart);
  if (cartDrawerBackdrop) {
    cartDrawerBackdrop.addEventListener('click', (e) => {
      if (e.target === cartDrawerBackdrop) closeCart();
    });
  }

  function addToCart(name, price, img) {
    const existing = cart.find(item => item.name === name);
    if (existing) {
      existing.qty += 1;
    } else {
      cart.push({ name, price, img, qty: 1 });
    }
    renderCart();

    // Trigger cart badge bounce
    if (cartCountBadge) {
      cartCountBadge.classList.remove('badge-bounce');
      void cartCountBadge.offsetWidth;
      cartCountBadge.classList.add('badge-bounce');
    }

    openCart();
  }

  addCartBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const name = btn.getAttribute('data-name');
      const price = parseFloat(btn.getAttribute('data-price'));
      const img = btn.getAttribute('data-img');
      addToCart(name, price, img);
    });
  });

  function renderCart() {
    const totalCount = cart.reduce((acc, item) => acc + item.qty, 0);
    cartCountBadge.textContent = totalCount;
    cartDrawerCount.textContent = `${totalCount} item${totalCount !== 1 ? 's' : ''} adicionado${totalCount !== 1 ? 's' : ''}`;

    if (cart.length === 0) {
      cartDrawerItems.innerHTML = `
        <div class="empty-cart-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-deep-indigo)" stroke-width="1.5">
            <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>
          </svg>
          <p>Sua sacola está vazia no momento.<br>Adicione cookies ou monte sua caixa!</p>
        </div>
      `;
      drawerTotalValue.textContent = 'R$ 0,00';
      btnCheckoutDrawer.disabled = true;
      return;
    }

    btnCheckoutDrawer.disabled = false;
    let total = 0;
    let html = '';

    cart.forEach((item, index) => {
      const lineCost = item.qty * item.price;
      total += lineCost;
      html += `
        <div class="drawer-cart-item">
          <img src="${item.img}" alt="${item.name}" class="drawer-item-img">
          <div class="drawer-item-info">
            <h4 class="drawer-item-name">${item.name}</h4>
            <span class="drawer-item-price">${item.qty}x R$ ${item.price.toFixed(2).replace('.', ',')}</span>
          </div>
          <span class="drawer-item-remove" data-index="${index}">Remover</span>
        </div>
      `;
    });

    cartDrawerItems.innerHTML = html;
    drawerTotalValue.textContent = `R$ ${total.toFixed(2).replace('.', ',')}`;

    // Attach remove event handlers
    const removeBtns = cartDrawerItems.querySelectorAll('.drawer-item-remove');
    removeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-index'), 10);
        cart.splice(idx, 1);
        renderCart();
      });
    });
  }

  // Checkout via WhatsApp from Drawer
  if (btnCheckoutDrawer) {
    btnCheckoutDrawer.addEventListener('click', () => {
      if (cart.length === 0) return;
      let orderMsg = `🍪 *NOVO PEDIDO SACOLA — YAEMI DOCES* 🍪\n--------------------------------------\n`;
      let total = 0;
      cart.forEach(item => {
        const cost = item.qty * item.price;
        total += cost;
        orderMsg += `• ${item.qty}x ${item.name} — R$ ${cost.toFixed(2).replace('.', ',')}\n`;
      });
      orderMsg += `--------------------------------------\n`;
      orderMsg += `💰 *TOTAL:* R$ ${total.toFixed(2).replace('.', ',')}\n\n`;
      orderMsg += `Olá Yaemi! Gostaria de finalizar o pedido da sacola com vocês. Podem me passar o valor da entrega para o meu endereço e a chave Pix?`;

      openWhatsApp(orderMsg);
    });
  }

  // Handle all generic WhatsApp action links (e.g. Orçamentos, Floating Button)
  const waLinks = document.querySelectorAll('.js-whatsapp-link');
  waLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const text = link.getAttribute('data-wa-text') || 'Olá Yaemi Doces! Vim pelo site e gostaria de fazer um pedido.';
      openWhatsApp(text);
    });
  });

  /* ==========================================================================
     6. MOBILE MENU & HEADER SCROLL EFFECT
     ========================================================================== */
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const mobileDrawer = document.getElementById('mobileDrawer');
  const header = document.getElementById('header');

  if (mobileMenuBtn && mobileDrawer) {
    mobileMenuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (header) {
        const bottom = Math.round(header.getBoundingClientRect().bottom);
        mobileDrawer.style.top = `${bottom}px`;
        mobileDrawer.style.maxHeight = `calc(100vh - ${bottom}px)`;
      }
      const isOpen = mobileDrawer.classList.toggle('open');
      mobileMenuBtn.classList.toggle('open', isOpen);
    });

    const mobileLinks = mobileDrawer.querySelectorAll('a');
    mobileLinks.forEach(link => {
      link.addEventListener('click', () => {
        mobileDrawer.classList.remove('open');
        mobileMenuBtn.classList.remove('open');
      });
    });

    // Fechar ao clicar fora do menu
    document.addEventListener('click', (e) => {
      if (mobileDrawer.classList.contains('open') && !mobileDrawer.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
        mobileDrawer.classList.remove('open');
        mobileMenuBtn.classList.remove('open');
      }
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth > 992 && mobileDrawer.classList.contains('open')) {
        mobileDrawer.classList.remove('open');
        mobileMenuBtn.classList.remove('open');
      }
    });
  }

  window.addEventListener('scroll', () => {
    if (window.scrollY > 40) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  }, { passive: true });

  /* ==========================================================================
     7. HERO COOKIE INTERACTIVE 3D PARALLAX TILT
     ========================================================================== */
  const heroStage = document.querySelector('.hero-cookie-stage');
  const heroCookieImg = document.getElementById('heroCookieImg');

  if (heroStage && heroCookieImg) {
    // Only enable on pointer fine devices (desktop mouse), skip on touch to preserve buttery smooth scrolling
    const isFinePointer = window.matchMedia('(pointer: fine)').matches;

    if (isFinePointer) {
      heroStage.addEventListener('mousemove', (e) => {
        const rect = heroStage.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;

        const tiltX = (y / (rect.height / 2)) * -10;
        const tiltY = (x / (rect.width / 2)) * 10;

        heroCookieImg.style.transform = `perspective(800px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale(1.05)`;
      });

      heroStage.addEventListener('mouseleave', () => {
        heroCookieImg.style.transform = '';
      });
    }
  }

  /* ==========================================================================
     8. SMOOTH SCROLL REVEAL (GPU-ACCELERATED OBSERVER)
     ========================================================================== */
  const revealTargets = document.querySelectorAll('.reveal-up, .reveal-fade, .reveal-scale, .reveal-card');

  if ('IntersectionObserver' in window && revealTargets.length > 0) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          observer.unobserve(entry.target);
        }
      });
    }, {
      root: null,
      threshold: 0.06,
      rootMargin: '0px 0px -30px 0px'
    });

    revealTargets.forEach(el => revealObserver.observe(el));
  } else {
    // Fallback gracioso
    revealTargets.forEach(el => el.classList.add('revealed'));
  }

});
