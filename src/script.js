// Dark Mode Toggle
document.getElementById("darkToggle").addEventListener("click", () => {
    document.body.classList.toggle("dark");
    localStorage.setItem("darkMode", document.body.classList.contains("dark"));
  });
  
  // Load dark mode from previous session
  window.addEventListener("load", () => {
    if (localStorage.getItem("darkMode") === "true") {
      document.body.classList.add("dark");
    }
  
    // Set fake visitor counter (optional random)
    document.getElementById("visitorCounter").innerText = Math.floor(1200 + Math.random() * 300);
  });
  
  // Language Selector
  document.getElementById("langSelect").addEventListener("change", (e) => {
    const lang = e.target.value;
    const intro = document.getElementById("siteIntro");
    if (lang === "fr") {
      intro.innerText = "Bienvenue sur notre plateforme de recettes !";
    } else if (lang === "es") {
      intro.innerText = "¡Bienvenido a nuestra plataforma de recetas!";
    } else {
      intro.innerText = "Welcome to our global recipe hub!";
    }
  });
  
  // Search filtering (static example — dynamic will need real data)
  document.getElementById("searchInput").addEventListener("input", (e) => {
    const query = e.target.value.toLowerCase();
    document.querySelectorAll(".recipe-card").forEach(card => {
      const title = card.querySelector("h3").textContent.toLowerCase();
      card.style.display = title.includes(query) ? "block" : "none";
    });
  });

  document.querySelectorAll(".dropdown-item").forEach(btn => {
    btn.addEventListener("click", () => {
      const selected = btn.getAttribute("data-category");
      document.querySelectorAll(".recipe-card").forEach(card => {
        const cat = card.getAttribute("data-category");
        card.style.display = !selected || cat === selected ? "block" : "none";
      });
    });
  });
  