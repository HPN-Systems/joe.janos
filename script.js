/* ================================================================
   joe.janos — Interactive Script
   Smooth scrolling, scroll reveal, nav behavior, mobile menu
   ================================================================ */

(() => {
    'use strict';

    // ---- DOM References ----
    const nav = document.getElementById('main-nav');
    const navToggle = document.getElementById('nav-toggle');
    const mobileMenu = document.getElementById('mobile-menu');
    const mobileLinks = document.querySelectorAll('.mobile-link');
    const allNavLinks = document.querySelectorAll('.nav-link, .mobile-link');

    // ---- Nav Scroll Effect ----
    let lastScroll = 0;

    function handleNavScroll() {
        const scrollY = window.scrollY;
        if (scrollY > 10) {
            nav.classList.add('scrolled');
        } else {
            nav.classList.remove('scrolled');
        }
        lastScroll = scrollY;
    }

    window.addEventListener('scroll', handleNavScroll, { passive: true });

    // ---- Mobile Menu Toggle ----
    navToggle.addEventListener('click', () => {
        navToggle.classList.toggle('active');
        mobileMenu.classList.toggle('active');
        document.body.style.overflow = mobileMenu.classList.contains('active') ? 'hidden' : '';
    });

    mobileLinks.forEach(link => {
        link.addEventListener('click', () => {
            navToggle.classList.remove('active');
            mobileMenu.classList.remove('active');
            document.body.style.overflow = '';
        });
    });

    // ---- Smooth Scroll for anchor links ----
    allNavLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            const href = link.getAttribute('href');
            if (href && href.startsWith('#')) {
                e.preventDefault();
                const target = document.querySelector(href);
                if (target) {
                    const navHeight = nav.offsetHeight;
                    const targetPosition = target.getBoundingClientRect().top + window.scrollY - navHeight - 20;
                    window.scrollTo({
                        top: targetPosition,
                        behavior: 'smooth'
                    });
                }
            }
        });
    });

    // ---- Scroll Reveal (Intersection Observer) ----
    function initScrollReveal() {
        // Elements to reveal
        const revealSelectors = [
            '.section-label',
            '.section-title',
            '.about-description',
            '.stat-card',
            '.work-card',
            '.timeline-item',
            '.contact-title',
            '.contact-subtitle',
            '.contact-socials',
            '.btn-large'
        ];

        const revealElements = document.querySelectorAll(revealSelectors.join(', '));

        revealElements.forEach(el => {
            el.classList.add('reveal');
        });

        const observerOptions = {
            root: null,
            rootMargin: '0px 0px -60px 0px',
            threshold: 0.1
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    // Stagger siblings
                    const parent = entry.target.parentElement;
                    const siblings = parent.querySelectorAll('.reveal:not(.revealed)');
                    let delay = 0;

                    if (siblings.length > 1 && parent.classList.contains('about-stats') ||
                        parent.classList.contains('work-grid') ||
                        parent.classList.contains('timeline') ||
                        parent.classList.contains('contact-socials')) {
                        siblings.forEach(sib => {
                            if (sib.getBoundingClientRect().top < window.innerHeight) {
                                setTimeout(() => {
                                    sib.classList.add('revealed');
                                }, delay);
                                delay += 100;
                            }
                        });
                    } else {
                        entry.target.classList.add('revealed');
                    }

                    observer.unobserve(entry.target);
                }
            });
        }, observerOptions);

        revealElements.forEach(el => {
            observer.observe(el);
        });
    }

    // ---- Active Nav Link on Scroll ----
    function initActiveNavTracking() {
        const sections = document.querySelectorAll('section[id]');
        const navLinks = document.querySelectorAll('.nav-link:not(.nav-link--cta)');

        const sectionObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const id = entry.target.getAttribute('id');
                    navLinks.forEach(link => {
                        link.style.color = '';
                        if (link.getAttribute('href') === `#${id}`) {
                            link.style.color = 'var(--gray-800)';
                        }
                    });
                }
            });
        }, {
            rootMargin: '-40% 0px -55% 0px'
        });

        sections.forEach(section => {
            sectionObserver.observe(section);
        });
    }

    // ---- Parallax-lite for hero ----
    function initHeroParallax() {
        const heroContent = document.querySelector('.hero-content');
        if (!heroContent) return;

        window.addEventListener('scroll', () => {
            const scrollY = window.scrollY;
            const heroHeight = document.querySelector('.hero').offsetHeight;
            if (scrollY < heroHeight) {
                const progress = scrollY / heroHeight;
                heroContent.style.transform = `translateY(${scrollY * 0.25}px)`;
                heroContent.style.opacity = 1 - progress * 1.2;
            }
        }, { passive: true });
    }

    // ---- Firebase Form Submission ----
    const firebaseConfig = {
        apiKey: "AIzaSyDcZKBXHaL_sQmKwKiexaX69jQ028qpUqg",
        authDomain: "hpn-project-da088.firebaseapp.com",
        projectId: "hpn-project-da088",
        storageBucket: "hpn-project-da088.firebasestorage.app",
        messagingSenderId: "414937667806",
        appId: "1:414937667806:web:d65eafb25c7459631f8a4f"
    };

    if (window.firebase) {
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        const db = firebase.firestore();

        window.handleSubmit = async (e) => {
            e.preventDefault();

            const form = document.getElementById('contactForm');
            const submitBtn = document.getElementById('submitBtn');

            // Collect form data
            const name = document.getElementById('name').value.trim();
            const email = document.getElementById('email').value.trim();
            const company = document.getElementById('company').value.trim();
            const message = document.getElementById('message').value.trim();

            submitBtn.disabled = true;
            submitBtn.innerHTML = 'Sending...';
            submitBtn.style.opacity = '0.7';

            // Build lead object
            const lead = {
                name: name,
                email: email,
                company: company || 'Not specified',
                message: message,
                status: 'new',
                timestamp: new Date().toISOString()
            };

            try {
                await db.collection('leads').add(lead);

                // Show success
                setTimeout(() => {
                    form.innerHTML = `
                        <div class="form-success">
                            <div class="success-icon">✓</div>
                            <h3>Message Sent</h3>
                            <p>Thanks for reaching out! I'll get back to you shortly.</p>
                        </div>
                    `;
                }, 800);
            } catch (error) {
                console.error("Error adding document: ", error);
                submitBtn.disabled = false;
                submitBtn.innerHTML = 'Send Message';
                submitBtn.style.opacity = '1';
                alert('There was an error sending your message. Please try again.');
            }
        };
    }

    // ---- Initialize ----
    document.addEventListener('DOMContentLoaded', () => {
        initScrollReveal();
        initActiveNavTracking();
        initHeroParallax();
    });

    // Trigger immediately if DOM already loaded
    if (document.readyState !== 'loading') {
        initScrollReveal();
        initActiveNavTracking();
        initHeroParallax();
    }
})();
