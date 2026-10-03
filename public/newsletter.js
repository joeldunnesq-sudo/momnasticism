const form = document.querySelector('.newsletter-form');
if (form) {
  form.addEventListener('submit', event => {
    event.preventDefault();
    const button = form.querySelector('button');
    const status = form.querySelector('.newsletter-status');
    button.disabled = true;
    status.textContent = 'Sending your invitation…';
    const script = document.createElement('script');
    const url = new URL(form.action);
    new FormData(form).forEach((value, key) => url.searchParams.set(key, String(value)));
    url.searchParams.set('ajax', '1');
    url.searchParams.set('callback', 'mlWebformSubmitted');
    let timer;
    const cleanup = () => { clearTimeout(timer); script.remove(); button.disabled = false; };
    const failed = () => { cleanup(); status.textContent = 'We couldn’t complete your signup. Please try again in a moment.'; };
    window.mlWebformSubmitted = answer => {
      cleanup();
      if (answer.success) window.location.assign('/subscribe/check-email');
      else status.textContent = 'Please check your email address and try again.';
    };
    script.onerror = failed;
    timer = setTimeout(failed, 20000);
    script.src = url.href;
    document.head.append(script);
  });
}
