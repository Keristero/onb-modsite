// Apply Christmas theme in December only
const currentMonth = new Date().getMonth();
if (currentMonth === 11) { // December is month 11 (0-indexed)
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'christmas.css';
    document.head.appendChild(link);
}
