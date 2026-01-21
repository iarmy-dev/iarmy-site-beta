// iArmy Analytics - Tracking des visites (sessions uniques, pas les refresh)
(function() {
  const SUPABASE_URL = 'https://byqfnpdcnifauhwgetcq.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5cWZucGRjbmlmYXVod2dldGNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4ODY1MTIsImV4cCI6MjA4MzQ2MjUxMn0.1W2OaRb0sApMvrG_28AoV2zUFAzrptzpwbR1c65tOPo';

  // Session duration in milliseconds (1 hour)
  const SESSION_DURATION = 60 * 60 * 1000;

  // Générer ou récupérer un visitor ID unique
  function getVisitorId() {
    let id = localStorage.getItem('iarmy_visitor_id');
    if (!id) {
      id = 'v_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
      localStorage.setItem('iarmy_visitor_id', id);
    }
    return id;
  }

  // Générer une session ID (expire après 1h d'inactivité)
  function getSessionId() {
    const now = Date.now();
    const sessionData = sessionStorage.getItem('iarmy_session');

    if (sessionData) {
      try {
        const { id, lastActivity } = JSON.parse(sessionData);
        // Si la session est encore valide (moins d'1h depuis la dernière activité)
        if (now - lastActivity < SESSION_DURATION) {
          // Mettre à jour le timestamp
          sessionStorage.setItem('iarmy_session', JSON.stringify({ id, lastActivity: now }));
          return id;
        }
      } catch (e) {}
    }

    // Nouvelle session
    const newId = 's_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
    sessionStorage.setItem('iarmy_session', JSON.stringify({ id: newId, lastActivity: now }));
    return newId;
  }

  // Vérifier si cette page a déjà été comptée dans cette session
  function shouldTrackPage() {
    const sessionId = getSessionId();
    const pagePath = window.location.pathname;
    const trackKey = 'iarmy_tracked_' + sessionId;

    try {
      const tracked = JSON.parse(sessionStorage.getItem(trackKey) || '[]');
      if (tracked.includes(pagePath)) {
        return false; // Déjà tracké dans cette session
      }
      // Marquer comme tracké
      tracked.push(pagePath);
      sessionStorage.setItem(trackKey, JSON.stringify(tracked));
      return true;
    } catch (e) {
      return true;
    }
  }

  // Récupérer le user_id si connecté (depuis Supabase session)
  function getUserId() {
    try {
      const session = localStorage.getItem('sb-byqfnpdcnifauhwgetcq-auth-token');
      if (session) {
        const parsed = JSON.parse(session);
        return parsed?.user?.id || null;
      }
    } catch (e) {}
    return null;
  }

  // Envoyer la visite
  async function trackVisit() {
    // Ne pas tracker si c'est un refresh ou déjà visité dans cette session
    if (!shouldTrackPage()) {
      return;
    }

    try {
      const data = {
        visitor_id: getVisitorId(),
        user_id: getUserId(),
        page_path: window.location.pathname,
        page_title: document.title,
        referrer: document.referrer || null,
        user_agent: navigator.userAgent,
        screen_width: window.screen.width,
        screen_height: window.screen.height,
        language: navigator.language
      };
      // Note: session_id géré côté client seulement (pas envoyé à Supabase)

      await fetch(SUPABASE_URL + '/rest/v1/page_visits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': 'Bearer ' + SUPABASE_ANON_KEY
        },
        body: JSON.stringify(data)
      });
    } catch (e) {
      // Silencieux - on ne veut pas perturber l'utilisateur
    }
  }

  // Tracker au chargement de la page
  if (document.readyState === 'complete') {
    trackVisit();
  } else {
    window.addEventListener('load', trackVisit);
  }
})();
