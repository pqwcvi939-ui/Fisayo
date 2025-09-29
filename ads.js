import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import { getFirestore, collection, query, where, orderBy, limit, getDocs, doc, getDoc, updateDoc, addDoc, serverTimestamp, deleteDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

window.formatTimestamp = window.formatTimestamp || ((timestamp) => {
  try {
    if (!timestamp || !timestamp.toDate) return 'N/A';
    return timestamp.toDate().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch (error) {
    console.error('Error in formatTimestamp:', error.message);
    return 'N/A';
  }
});

window.displayErrorMessage = window.displayErrorMessage || ((selector, message) => {
  const element = document.querySelector(selector);
  if (element) {
    element.innerHTML = `<p style="color: red;">${message}</p>`;
  } else {
    console.error('Error display element not found:', selector);
  }
});

window.isValidUrl = window.isValidUrl || ((url) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
});

window.withRetry = window.withRetry || (async (fn, retries = 3, delay = 1000) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === retries) throw error;
      console.warn(`Retry ${attempt} failed:`, error.message);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
});

function checkTransformSupport() {
  const testEl = document.createElement('div');
  return 'transform' in testEl.style && 'perspective' in testEl.style;
}

const firebaseConfig = {
  apiKey: window.env?.VITE_FIREBASE_API_KEY || 'AIzaSyDrzSgCHn53kfa4dJJVJhDD717v8SPozR0',
  authDomain: window.env?.VITE_FIREBASE_AUTH_DOMAIN || 'naija-truths.firebaseapp.com',
  projectId: window.env?.VITE_FIREBASE_PROJECT_ID || 'naija-truths',
  storageBucket: window.env?.VITE_FIREBASE_STORAGE_BUCKET || 'naija-truths.firebasestorage.app',
  messagingSenderId: window.env?.VITE_FIREBASE_MESSAGING_SENDER_ID || '476936659655',
  appId: window.env?.VITE_FIREBASE_APP_ID || '1:476936659655:web:0df8b9419012dac9e014e2',
  measurementId: window.env?.VITE_FIREBASE_MEASUREMENT_ID || 'G-69WH8S8X8H',
};

let db, auth;
try {
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
  window.db = db;
  window.auth = auth;
  console.log('Firebase initialized in ads.js');
} catch (error) {
  console.error('Firebase initialization failed in ads.js:', error.message);
  window.displayErrorMessage('body', 'Failed to connect to the database. Check Firebase configuration.');
}

function setupCarousel(container, adType) {
  console.log(`Setting up premium 3D carousel for ${adType} ad`);
  const slides = container.querySelectorAll('.ad-slide');
  const navContainer = container.querySelector('.ad-nav') || document.createElement('div');
  if (!container.contains(navContainer)) {
    navContainer.classList.add('ad-nav');
    container.appendChild(navContainer);
  }

  if (!slides.length) {
    console.warn(`No slides found for ${adType} ad`);
    container.innerHTML = '<p>No ad content available.</p>';
    return;
  }

  const hasTransformSupport = checkTransformSupport();
  let currentSlide = 0;
  const slideDuration = 7000;
  let intervalId = null;
  let touchStartX = 0;
  let touchEndX = 0;
  const swipeThreshold = 50;
  const totalSlides = slides.length;
  const angle = 360 / totalSlides;
  let carouselInitialized = false;

  if (totalSlides === 1) {
    console.log(`Single ad for ${adType}, applying pulse animation`);
    slides[0].classList.add('active', 'single-ad');
    slides[0].style.opacity = '1';
    slides[0].style.transform = 'rotateY(0deg) translateZ(0)';
    slides[0].setAttribute('aria-hidden', 'false');
    navContainer.style.display = 'none';
    return;
  }

  navContainer.innerHTML = '';
  slides.forEach((_, index) => {
    const dot = document.createElement('span');
    dot.classList.add('ad-nav-dot');
    if (index === 0) dot.classList.add('active');
    dot.setAttribute('aria-label', `Go to ad ${index + 1}`);
    dot.addEventListener('click', () => {
      pauseCarousel();
      currentSlide = index;
      showSlide(currentSlide);
      startCarousel();
    });
    navContainer.appendChild(dot);
  });

  slides.forEach((slide, index) => {
    slide.style.transform = hasTransformSupport
      ? `rotateY(${index * angle}deg) translateZ(400px)`
      : `translateX(${index * 100}%)`;
    slide.style.opacity = index === 0 ? '1' : '0';
    slide.setAttribute('aria-hidden', index === 0 ? 'false' : 'true');
  });

  function showSlide(index) {
    if (!slides.length) return;
    const offset = hasTransformSupport ? -index * angle : -index * 100;
    const carousel = container.querySelector('.ad-carousel');
    carousel.style.transform = hasTransformSupport
      ? `rotateY(${offset}deg)`
      : `translateX(${offset}%)`;
    slides.forEach((slide, i) => {
      const isActive = i === index;
      slide.classList.toggle('active', isActive);
      slide.style.opacity = isActive ? '1' : '0';
      slide.setAttribute('aria-hidden', isActive ? 'false' : 'true');
    });
    navContainer.querySelectorAll('.ad-nav-dot').forEach((dot, i) => {
      dot.classList.toggle('active', i === index);
    });
    console.log(`Showing ${adType} slide ${index + 1}/${totalSlides}`);
  }

  function startCarousel() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      console.log(`${adType} carousel not started due to reduced motion preference`);
      return;
    }
    if (intervalId) return;
    intervalId = setInterval(() => {
      currentSlide = (currentSlide + 1) % totalSlides;
      showSlide(currentSlide);
    }, slideDuration);
    function animate() {
      if (!intervalId) {
        currentSlide = (currentSlide + 1) % totalSlides;
        showSlide(currentSlide);
        setTimeout(() => requestAnimationFrame(animate), slideDuration);
      }
    }
    if (!carouselInitialized) {
      requestAnimationFrame(animate);
      carouselInitialized = true;
    }
    console.log(`${adType} carousel started`);
  }

  function pauseCarousel() {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
      console.log(`${adType} carousel paused`);
    }
  }

  function handleSwipe() {
    const swipeDistance = touchEndX - touchStartX;
    if (Math.abs(swipeDistance) > swipeThreshold) {
      pauseCarousel();
      if (swipeDistance < 0) {
        currentSlide = (currentSlide + 1) % totalSlides;
      } else {
        currentSlide = (currentSlide - 1 + totalSlides) % totalSlides;
      }
      showSlide(currentSlide);
      startCarousel();
    }
  }

  container.addEventListener('mouseenter', pauseCarousel);
  container.addEventListener('mouseleave', startCarousel);
  container.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
    pauseCarousel();
  });
  container.addEventListener('touchmove', (e) => {
    touchEndX = e.changedTouches[0].screenX;
  });
  container.addEventListener('touchend', handleSwipe);
  container.addEventListener('focusin', pauseCarousel);
  container.addEventListener('focusout', startCarousel);

  showSlide(0);
  setTimeout(() => startCarousel(), 100);
}

async function loadPublicAds() {
  console.log('loadPublicAds called');
  const topAd = document.getElementById('top-ad');
  const middleAd = document.getElementById('middle-ad');
  if (!db || (!topAd && !middleAd)) {
    console.warn('Database or ad containers not found for public ads', { db: !!db, topAd: !!topAd, middleAd: !!middleAd });
    return;
  }

  const now = new Date();
  try {
    const topQuery = query(
      collection(db, 'ads'),
      where('status', '==', 'active'),
      where('type', '==', 'top'),
      where('startDate', '<=', now),
      where('endDate', '>=', now),
      orderBy('startDate', 'desc'),
      limit(5)
    );

    const middleQuery = query(
      collection(db, 'ads'),
      where('status', '==', 'active'),
      where('type', '==', 'middle'),
      where('startDate', '<=', now),
      where('endDate', '>=', now),
      orderBy('startDate', 'desc'),
      limit(5)
    );

    console.log('Executing public ad queries...');
    const [topSnapshot, middleSnapshot] = await Promise.all([
      window.withRetry(() => getDocs(topQuery)),
      middleAd ? window.withRetry(() => getDocs(middleQuery)) : Promise.resolve(null)
    ]);

    console.log('Top ad snapshot:', topSnapshot.size, 'Middle ad snapshot:', middleSnapshot ? middleSnapshot.size : 'skipped');

    if (topAd) {
      if (topSnapshot.empty) {
        console.log('No active top ad found');
        topAd.innerHTML = '<p>No top ad available.</p><button class="ad-close" aria-label="Close advertisement">×</button>';
      } else {
        const ads = topSnapshot.docs.map(doc => doc.data());
        console.log('Rendering top ads:', ads);
        const carouselHtml = `
          <div class="ad-carousel" tabindex="0">
            ${ads.map((ad, index) => {
              const imageUrl = ad.imageUrl && window.isValidUrl(ad.imageUrl) ? ad.imageUrl : 'https://via.placeholder.com/728x90';
              return `
                <div class="ad-slide${index === 0 ? ' active' : ''}" aria-hidden="${index === 0 ? 'false' : 'true'}">
                  ${ad.embedCode || `
                    <a href="${ad.url || '#'}" target="_blank" class="ad-link" aria-label="Advertisement">
                      <img src="${imageUrl}" 
                           srcset="${imageUrl} 728w, ${ad.mobileImageUrl || 'https://via.placeholder.com/320x50'} 320w, ${ad.tabletImageUrl || 'https://via.placeholder.com/600x75'} 600w"
                           sizes="(max-width: 767px) 320px, (max-width: 991px) 600px, 728px"
                           alt="Advertisement" 
                           loading="lazy"
                           onerror="this.src='https://via.placeholder.com/728x90';">
                      <div class="ad-content-overlay">
                        ${ad.text ? `<span class="ad-text">${ad.text}</span>` : ''}
                        ${ad.ctaText ? `<button class="ad-cta">${ad.ctaText}</button>` : ''}
                      </div>
                    </a>
                  `}
                </div>
              `;
            }).join('')}
          </div>
          <button class="ad-close" aria-label="Close advertisement">×</button>
          <div class="ad-nav"></div>
        `;
        topAd.innerHTML = carouselHtml;
        setTimeout(() => {
          if (ads.length > 0) setupCarousel(topAd, 'top');
        }, 100);
        const closeButton = topAd.querySelector('.ad-close');
        if (closeButton) {
          closeButton.addEventListener('click', () => {
            console.log('Top ad closed');
            topAd.style.display = 'none';
            setTimeout(() => {
              topAd.style.display = 'block';
              if (ads.length > 0) setupCarousel(topAd, 'top');
              console.log('Top ad reappeared');
            }, 15000);
          });
        }
      }
    }

    if (middleAd) {
      if (middleSnapshot && middleSnapshot.empty) {
        console.log('No active middle ad found');
        middleAd.innerHTML = '<p>No middle ad available.</p><button class="ad-close" aria-label="Close advertisement">×</button>';
      } else if (middleSnapshot) {
        const ads = middleSnapshot.docs.map(doc => doc.data());
        console.log('Rendering middle ads:', ads);
        const carouselHtml = `
          <div class="ad-carousel" tabindex="0">
            ${ads.map((ad, index) => {
              const imageUrl = ad.imageUrl && window.isValidUrl(ad.imageUrl) ? ad.imageUrl : 'https://via.placeholder.com/970x250';
              return `
                <div class="ad-slide${index === 0 ? ' active' : ''}" aria-hidden="${index === 0 ? 'false' : 'true'}">
                  ${ad.embedCode || `
                    <a href="${ad.url || '#'}" target="_blank" class="ad-link" aria-label="Advertisement">
                      <img src="${imageUrl}" 
                           srcset="${imageUrl} 970w, ${ad.mobileImageUrl || 'https://via.placeholder.com/300x250'} 300w, ${ad.tabletImageUrl || 'https://via.placeholder.com/300x250'} 300w"
                           sizes="(max-width: 991px) 300px, 970px"
                           alt="Advertisement" 
                           loading="lazy"
                           onerror="this.src='https://via.placeholder.com/970x250';">
                      <div class="ad-content-overlay">
                        ${ad.text ? `<span class="ad-text">${ad.text}</span>` : ''}
                        ${ad.ctaText ? `<button class="ad-cta">${ad.ctaText}</button>` : ''}
                      </div>
                    </a>
                  `}
                </div>
              `;
            }).join('')}
          </div>
          <button class="ad-close" aria-label="Close advertisement">×</button>
          <div class="ad-nav"></div>
        `;
        middleAd.innerHTML = carouselHtml;
        setTimeout(() => {
          if (ads.length > 0) setupCarousel(middleAd, 'middle');
        }, 100);
        const closeButton = middleAd.querySelector('.ad-close');
        if (closeButton) {
          closeButton.addEventListener('click', () => {
            console.log('Middle ad closed');
            middleAd.style.display = 'none';
            setTimeout(() => {
              middleAd.style.display = 'block';
              if (ads.length > 0) setupCarousel(middleAd, 'middle');
              console.log('Middle ad reappeared');
            }, 15000);
          });
        }
      }
    }
  } catch (error) {
    console.error('Error loading public ads:', error.code, error.message);
    if (topAd) window.displayErrorMessage('#top-ad', 'Failed to load ad: ' + error.message);
    if (middleAd) window.displayErrorMessage('#middle-ad', 'Failed to load ad: ' + error.message);
  }
}

async function loadAdminAds() {
  console.log('loadAdminAds called');
  const adList = document.getElementById('ad-list');
  if (!db || !adList) {
    console.warn('Database or ad-list container not found', { db: !!db, adList: !!adList });
    window.displayErrorMessage('#ad-list', 'Database or ad list container not initialized.');
    return;
  }

  try {
    const q = query(collection(db, 'ads'), orderBy('startDate', 'desc'));
    console.log('Setting up real-time listener for ads...');
    onSnapshot(q, (snapshot) => {
      console.log('Snapshot received, doc count:', snapshot.size);
      adList.innerHTML = '';
      if (snapshot.empty) {
        console.log('No ads found in Firestore');
        adList.innerHTML = '<p>No ads found.</p>';
        return;
      }
      snapshot.forEach(doc => {
        const ad = doc.data();
        console.log('Rendering ad:', ad);
        const adElement = document.createElement('div');
        adElement.classList.add('ad-card');
        adElement.innerHTML = `
          <h3>${ad.type ? ad.type.charAt(0).toUpperCase() + ad.type.slice(1) : 'Untitled Ad'}</h3>
          <p><strong>URL:</strong> ${ad.url ? `<a href="${ad.url}" target="_blank">${ad.url}</a>` : 'No URL'}</p>
          <p><strong>Image URL:</strong> ${ad.imageUrl || 'No Image'}</p>
          <p><strong>Embed Code:</strong> ${ad.embedCode ? 'Provided' : 'None'}</p>
          <p><strong>Sponsor Text:</strong> ${ad.text || 'None'}</p>
          <p><strong>CTA Text:</strong> ${ad.ctaText || 'None'}</p>
          <p><strong>Status:</strong> ${ad.status === 'active' ? 'Active' : 'Inactive'}</p>
          <p><strong>Start Date:</strong> ${window.formatTimestamp(ad.startDate)}</p>
          <p><strong>End Date:</strong> ${window.formatTimestamp(ad.endDate)}</p>
          <div class="ad-card-actions">
            <button class="edit-ad-button ripple-btn" data-id="${doc.id}">Edit</button>
            <button class="delete-ad-button ripple-btn" data-id="${doc.id}">Delete</button>
          </div>
        `;
        adList.appendChild(adElement);
      });
      document.querySelectorAll('.edit-ad-button').forEach(button => {
        button.addEventListener('click', async () => {
          const adId = button.dataset.id;
          console.log('Edit ad clicked, ID:', adId);
          const docRef = doc(db, 'ads', adId);
          try {
            const docSnap = await window.withRetry(() => getDoc(docRef));
            if (!docSnap.exists()) {
              console.error('Ad not found for editing, ID:', adId);
              window.displayErrorMessage('#ad-list', 'Ad not found for editing.');
              return;
            }
            const ad = docSnap.data();
            console.log('Loading ad for edit:', ad);
            document.getElementById('ad-id').value = adId;
            document.getElementById('ad-type').value = ad.type || '';
            document.getElementById('ad-url').value = ad.url || '';
            document.getElementById('ad-image-url').value = ad.imageUrl || '';
            document.getElementById('ad-embed-code').value = ad.embedCode || '';
            document.getElementById('ad-text').value = ad.text || '';
            document.getElementById('ad-cta-text').value = ad.ctaText || '';
            document.getElementById('ad-start-date').value = ad.startDate ? new Date(ad.startDate.toDate()).toISOString().split('T')[0] : '';
            document.getElementById('ad-end-date').value = ad.endDate ? new Date(ad.endDate.toDate()).toISOString().split('T')[0] : '';
            document.getElementById('ad-status').value = ad.status || 'inactive';
          } catch (error) {
            console.error('Error loading ad for editing:', error.code, error.message);
            window.displayErrorMessage('#ad-list', 'Failed to load ad for editing: ' + error.message);
          }
        });
      });
      document.querySelectorAll('.delete-ad-button').forEach(button => {
        button.addEventListener('click', async () => {
          const adId = button.dataset.id;
          console.log('Delete ad clicked, ID:', adId);
          if (confirm('Are you sure you want to delete this ad? This action cannot be undone.')) {
            try {
              await window.withRetry(() => deleteDoc(doc(db, 'ads', adId)));
              console.log('Ad deleted, ID:', adId);
              alert('Ad deleted successfully!');
            } catch (error) {
              console.error('Error deleting ad:', error.code, error.message);
              window.displayErrorMessage('#ad-list', 'Failed to delete ad: ' + error.message);
            }
          }
        });
      });
    }, (error) => {
      console.error('Error in real-time ads listener:', error.code, error.message);
      window.displayErrorMessage('#ad-list', 'Failed to load ads: ' + error.message);
    });
  } catch (error) {
    console.error('Error loading admin ads:', error.code, error.message);
    window.displayErrorMessage('#ad-list', 'Failed to load ads: ' + error.message);
  }
}

function initializeAdForm() {
  console.log('initializeAdForm called');
  const adForm = document.getElementById('ad-form');
  if (!adForm || !db || !auth) {
    console.warn('Ad form, database, or auth not found', { adForm: !!adForm, db: !!db, auth: !!auth });
    window.displayErrorMessage('#ad-form', 'Form, database, or authentication not initialized.');
    return;
  }

  adForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log('Ad form submitted');
    if (!auth.currentUser) {
      console.error('No authenticated user found');
      window.displayErrorMessage('#ad-form', 'You must be logged in as an admin to manage ads.');
      return;
    }
    try {
      const idTokenResult = await auth.currentUser.getIdTokenResult();
      if (!idTokenResult.claims.admin) {
        console.error('User is not an admin:', auth.currentUser.email);
        window.displayErrorMessage('#ad-form', 'You do not have admin privileges to manage ads.');
        return;
      }
      console.log('User is admin:', auth.currentUser.email);
    } catch (error) {
      console.error('Error checking admin status:', error.code, error.message);
      window.displayErrorMessage('#ad-form', 'Failed to verify admin status: ' + error.message);
      return;
    }

    const id = document.getElementById('ad-id').value;
    const type = document.getElementById('ad-type').value;
    const url = document.getElementById('ad-url').value;
    const imageUrl = document.getElementById('ad-image-url').value;
    const embedCode = document.getElementById('ad-embed-code').value;
    const text = document.getElementById('ad-text').value.trim();
    const ctaText = document.getElementById('ad-cta-text').value.trim();
    const startDate = document.getElementById('ad-start-date').value;
    const endDate = document.getElementById('ad-end-date').value;
    const status = document.getElementById('ad-status').value;

    if (!type) {
      console.warn('Ad type is required');
      window.displayErrorMessage('#ad-form', 'Ad type is required.');
      return;
    }
    if (url && !window.isValidUrl(url)) {
      console.warn('Invalid ad URL:', url);
      window.displayErrorMessage('#ad-form', 'Valid ad URL is required.');
      return;
    }
    if (imageUrl && !window.isValidUrl(imageUrl)) {
      console.warn('Invalid ad image URL:', imageUrl);
      window.displayErrorMessage('#ad-form', 'Valid ad image URL is required.');
      return;
    }
    if (text && text.length > 50) {
      console.warn('Sponsor text exceeds 50 characters:', text);
      window.displayErrorMessage('#ad-form', 'Sponsor text must be 50 characters or less.');
      return;
    }
    if (ctaText && ctaText.length > 20) {
      console.warn('CTA text exceeds 20 characters:', ctaText);
      window.displayErrorMessage('#ad-form', 'CTA text must be 20 characters or less.');
      return;
    }
    if (!startDate || !endDate) {
      console.warn('Start and end dates are required');
      window.displayErrorMessage('#ad-form', 'Start and end dates are required.');
      return;
    }
    if (new Date(endDate) < new Date(startDate)) {
      console.warn('End date is before start date:', { startDate, endDate });
      window.displayErrorMessage('#ad-form', 'End date must be after start date.');
      return;
    }

    const ad = {
      type,
      url: url || '',
      imageUrl: imageUrl || '',
      embedCode: embedCode || '',
      text: text || '',
      ctaText: ctaText || '',
      startDate: new Date(startDate + 'T00:00:00Z'),
      endDate: new Date(endDate + 'T00:00:00Z'),
      status,
      createdAt: serverTimestamp()
    };

    try {
      console.log('Saving ad:', ad);
      if (id) {
        await window.withRetry(() => updateDoc(doc(db, 'ads', id), ad));
        console.log('Ad updated successfully, ID:', id);
        alert('Ad updated successfully!');
      } else {
        const docRef = await window.withRetry(() => addDoc(collection(db, 'ads'), ad));
        console.log('Ad created successfully, ID:', docRef.id);
        alert('Ad created successfully!');
      }
      adForm.reset();
      document.getElementById('ad-id').value = '';
    } catch (error) {
      console.error('Error saving ad:', error.code, error.message);
      window.displayErrorMessage('#ad-form', 'Failed to save ad: ' + error.message);
    }
  });

  const adClearButton = document.getElementById('ad-clear-button');
  if (adClearButton) {
    adClearButton.addEventListener('click', () => {
      console.log('Ad form cleared');
      adForm.reset();
      document.getElementById('ad-id').value = '';
    });
  }
}

function initializeAdSearch() {
  console.log('initializeAdSearch called');
  const adSearchButton = document.getElementById('ad-search-button');
  const adSearchClear = document.getElementById('ad-search-clear');
  const adSearchInput = document.getElementById('ad-search-input');
  const adList = document.getElementById('ad-list');
  if (!db || !adSearchButton || !adSearchClear || !adSearchInput || !adList) {
    console.warn('Ad search elements or database not found', { db: !!db, adSearchButton: !!adSearchButton, adSearchClear: !!adSearchClear, adSearchInput: !!adSearchInput, adList: !!adList });
    window.displayErrorMessage('#ad-list', 'Search elements or database not initialized.');
    return;
  }

  adSearchButton.addEventListener('click', async () => {
    const searchInput = adSearchInput.value.trim().toLowerCase();
    console.log('Ad search initiated with input:', searchInput);
    adList.innerHTML = '<p>Loading ads...</p>';

    try {
      let snapshot;
      const datePattern = /^\d{4}-\d{2}-\d{2}$/;
      if (!searchInput) {
        const q = query(collection(db, 'ads'), orderBy('startDate', 'desc'), limit(50));
        snapshot = await window.withRetry(() => getDocs(q));
      } else if (datePattern.test(searchInput)) {
        const startDate = new Date(searchInput + 'T00:00:00Z');
        if (isNaN(startDate.getTime())) {
          console.warn('Invalid date format:', searchInput);
          adList.innerHTML = '';
          window.displayErrorMessage('#ad-list', 'Invalid date format. Use YYYY-MM-DD (e.g., 2025-09-18).');
          return;
        }
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 1);
        const q = query(
          collection(db, 'ads'),
          where('startDate', '>=', startDate),
          where('startDate', '<', endDate),
          orderBy('startDate', 'desc'),
          limit(50)
        );
        snapshot = await window.withRetry(() => getDocs(q));
      } else {
        const q = query(
          collection(db, 'ads'),
          where('type', '>=', searchInput),
          where('type', '<=', searchInput + '\uf8ff'),
          orderBy('type'),
          orderBy('startDate', 'desc'),
          limit(50)
        );
        snapshot = await window.withRetry(() => getDocs(q));
      }

      console.log('Ad search snapshot:', snapshot.size);
      adList.innerHTML = '';
      if (snapshot.empty) {
        adList.innerHTML = '<p>No ads found for the given search.</p>';
        console.log('No ads found for search:', searchInput);
        return;
      }

      snapshot.forEach(doc => {
        const ad = doc.data();
        const adElement = document.createElement('div');
        adElement.classList.add('ad-card');
        adElement.innerHTML = `
          <h3>${ad.type ? ad.type.charAt(0).toUpperCase() + ad.type.slice(1) : 'Untitled Ad'}</h3>
          <p><strong>URL:</strong> ${ad.url ? `<a href="${ad.url}" target="_blank">${ad.url}</a>` : 'No URL'}</p>
          <p><strong>Image URL:</strong> ${ad.imageUrl || 'No Image'}</p>
          <p><strong>Embed Code:</strong> ${ad.embedCode ? 'Provided' : 'None'}</p>
          <p><strong>Sponsor Text:</strong> ${ad.text || 'None'}</p>
          <p><strong>CTA Text:</strong> ${ad.ctaText || 'None'}</p>
          <p><strong>Status:</strong> ${ad.status === 'active' ? 'Active' : 'Inactive'}</p>
          <p><strong>Start Date:</strong> ${window.formatTimestamp(ad.startDate)}</p>
          <p><strong>End Date:</strong> ${window.formatTimestamp(ad.endDate)}</p>
          <div class="ad-card-actions">
            <button class="edit-ad-button ripple-btn" data-id="${doc.id}">Edit</button>
            <button class="delete-ad-button ripple-btn" data-id="${doc.id}">Delete</button>
          </div>
        `;
        adList.appendChild(adElement);
      });

      document.querySelectorAll('.edit-ad-button').forEach(button => {
        button.addEventListener('click', async () => {
          const adId = button.dataset.id;
          console.log('Edit ad clicked, ID:', adId);
          const docRef = doc(db, 'ads', adId);
          try {
            const docSnap = await window.withRetry(() => getDoc(docRef));
            if (!docSnap.exists()) {
              console.error('Ad not found for editing, ID:', adId);
              window.displayErrorMessage('#ad-list', 'Ad not found for editing.');
              return;
            }
            const ad = docSnap.data();
            console.log('Loading ad for edit:', ad);
            document.getElementById('ad-id').value = adId;
            document.getElementById('ad-type').value = ad.type || '';
            document.getElementById('ad-url').value = ad.url || '';
            document.getElementById('ad-image-url').value = ad.imageUrl || '';
            document.getElementById('ad-embed-code').value = ad.embedCode || '';
            document.getElementById('ad-text').value = ad.text || '';
            document.getElementById('ad-cta-text').value = ad.ctaText || '';
            document.getElementById('ad-start-date').value = ad.startDate ? new Date(ad.startDate.toDate()).toISOString().split('T')[0] : '';
            document.getElementById('ad-end-date').value = ad.endDate ? new Date(ad.endDate.toDate()).toISOString().split('T')[0] : '';
            document.getElementById('ad-status').value = ad.status || 'inactive';
          } catch (error) {
            console.error('Error loading ad for editing:', error.code, error.message);
            window.displayErrorMessage('#ad-list', 'Failed to load ad for editing: ' + error.message);
          }
        });
      });
      document.querySelectorAll('.delete-ad-button').forEach(button => {
        button.addEventListener('click', async () => {
          const adId = button.dataset.id;
          console.log('Delete ad clicked, ID:', adId);
          if (confirm('Are you sure you want to delete this ad? This action cannot be undone.')) {
            try {
              await window.withRetry(() => deleteDoc(doc(db, 'ads', adId)));
              console.log('Ad deleted, ID:', adId);
              alert('Ad deleted successfully!');
            } catch (error) {
              console.error('Error deleting ad:', error.code, error.message);
              window.displayErrorMessage('#ad-list', 'Failed to delete ad: ' + error.message);
            }
          }
        });
      });
    } catch (error) {
      console.error('Error searching ads:', error.code, error.message);
      window.displayErrorMessage('#ad-list', 'Failed to load ads: ' + error.message);
    }
  });

  adSearchClear.addEventListener('click', () => {
    console.log('Ad search cleared');
    adSearchInput.value = '';
    loadAdminAds();
  });

  adSearchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      console.log('Enter key pressed for ad search');
      adSearchButton.click();
    }
  });
}

function initializeTabSwitching() {
  console.log('initializeTabSwitching called');
  const tabLinks = document.querySelectorAll('.tab-button');
  const tabContents = document.querySelectorAll('.tab-pane');
  if (!tabLinks.length || !tabContents.length) {
    console.warn('Tab navigation elements not found', { tabLinks: tabLinks.length, tabContents: tabContents.length });
    return;
  }

  let isAdFormInitialized = false;
  function showTab(tabId) {
    tabLinks.forEach(link => {
      link.classList.toggle('active', link.dataset.tab === tabId);
      link.setAttribute('aria-selected', link.dataset.tab === tabId ? 'true' : 'false');
    });
    tabContents.forEach(content => {
      content.classList.toggle('active', content.id === `${tabId}-tab`);
      content.setAttribute('aria-hidden', content.id === `${tabId}-tab` ? 'false' : 'true');
    });

    if (tabId === 'articles' && typeof window.loadAdminArticles === 'function') {
      console.log('Switching to articles tab, loading articles...');
      window.loadAdminArticles();
    } else if (tabId === 'ads' && !isAdFormInitialized) {
      console.log('Switching to ads tab, initializing form and search...');
      initializeAdForm();
      initializeAdSearch();
      loadAdminAds();
      isAdFormInitialized = true;
    }
  }

  tabLinks.forEach(link => {
    link.addEventListener('click', () => {
      const tabId = link.dataset.tab;
      if (tabId) {
        console.log('Tab clicked:', tabId);
        showTab(tabId);
      }
    });
  });

  const defaultTab = document.querySelector('.tab-button.active');
  if (defaultTab) {
    const tabId = defaultTab.dataset.tab;
    console.log('Setting default tab to:', tabId);
    showTab(tabId);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  console.log('DOMContentLoaded in ads.js');
  if (document.getElementById('top-ad') || document.getElementById('middle-ad')) {
    console.log('Found ad containers, loading public ads...');
    loadPublicAds();
  }
  if (document.querySelector('.tab-button')) {
    console.log('Found tab buttons, initializing tab switching...');
    initializeTabSwitching();
  }
});