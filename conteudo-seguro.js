(function (root) {
  'use strict';
  // Sanitizar apenas a exibicao; os documentos originais continuam nos backups.
  root.htmlSeguroAtendimento = function (html) {
    if (!root.DOMPurify) throw new Error('A protecao dos documentos nao carregou. Atualize o app.');
    return root.DOMPurify.sanitize(String(html || ''), {
      USE_PROFILES: { html: true },
      ADD_TAGS: ['font'],
      ADD_ATTR: ['face'],
      FORBID_TAGS: ['form', 'input', 'button', 'textarea', 'select', 'option', 'style', 'link', 'meta'],
      FORBID_ATTR: ['srcdoc', 'autofocus']
    });
  };
})(window);
