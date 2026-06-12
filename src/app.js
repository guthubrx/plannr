
        // Detection mode iframe/embedded
        (function() {
            var params = new URLSearchParams(window.location.search);
            var embedded = params.get('embedded') === '1';
            var inIframe = false;
            try { if (window.parent !== window) inIframe = true; } catch(e) {}
            if (embedded) document.documentElement.classList.add('embedded');
            if (inIframe) document.documentElement.classList.add('in-iframe');
        })();

        // ========================================
        // Stockage namespacé par document (v2.1)
        // ========================================
        // Plusieurs copies plannr_[sujet].html sur le même origin ne doivent
        // PAS partager titres/préférences entre elles (ni avec Riskr, qui
        // utilisait les mêmes clés génériques). Lecture : fallback sur la
        // clé legacy pour migrer en douceur les valeurs existantes.
        const LS_PREFIX = 'plannr:' + location.pathname + ':';
        const appStorage = {
            getItem(key) {
                const v = localStorage.getItem(LS_PREFIX + key);
                return v !== null ? v : localStorage.getItem(key);
            },
            setItem(key, value) { localStorage.setItem(LS_PREFIX + key, value); },
            removeItem(key) { localStorage.removeItem(LS_PREFIX + key); }
        };

        // ========================================
        // Système de Toast Notifications
        // ========================================

        // Créer le conteneur de toasts au chargement
        document.addEventListener('DOMContentLoaded', function() {
            if (!document.querySelector('.toast-container')) {
                const container = document.createElement('div');
                container.className = 'toast-container';
                document.body.appendChild(container);
            }

            // Initialiser le sélecteur de palettes de couleurs
            initColorPaletteSelector();
        });

        // Fonction pour afficher une notification toast
        function showToast(message, type = 'success') {
            const container = document.querySelector('.toast-container') ||
                              (() => {
                                  const c = document.createElement('div');
                                  c.className = 'toast-container';
                                  document.body.appendChild(c);
                                  return c;
                              })();

            const toast = document.createElement('div');
            toast.className = `toast ${type}`;
            toast.textContent = message;

            container.appendChild(toast);

            // Supprimer le toast après l'animation (3 secondes)
            setTimeout(() => {
                toast.remove();
            }, 3000);
        }

        // ========================================
        // Système Undo/Redo
        // ========================================
        let history = [];
        let historyIndex = -1;
        const MAX_HISTORY = 50;

        // Sauvegarder l'état actuel dans l'historique
        function saveState() {
            // Supprimer tous les états après l'index courant (si on a fait undo)
            history = history.slice(0, historyIndex + 1);

            // Créer une copie profonde de l'état actuel
            const state = {
                riskGroups: JSON.parse(JSON.stringify(riskGroups)),
                risks: JSON.parse(JSON.stringify(risks))
            };

            // Ajouter à l'historique
            history.push(state);

            // Limiter la taille de l'historique
            if (history.length > MAX_HISTORY) {
                history.shift();
            } else {
                historyIndex++;
            }
        }

        // Restaurer un état depuis l'historique
        function restoreState(state) {
            // Restaurer l'état
            riskGroups.length = 0;
            riskGroups.push(...JSON.parse(JSON.stringify(state.riskGroups)));

            risks.length = 0;
            risks.push(...JSON.parse(JSON.stringify(state.risks)));

            // Re-rendre l'interface
            renderPlanning();
            updateGantt();
            updateDashboard();
        }

        // Fonction Undo
        function undo() {
            if (historyIndex > 0) {
                historyIndex--;
                restoreState(history[historyIndex]);
                showToast('↶ Annulation');
            } else {
                showToast('Rien à annuler', 'error');
            }
        }

        // Fonction Redo
        function redo() {
            if (historyIndex < history.length - 1) {
                historyIndex++;
                restoreState(history[historyIndex]);
                showToast('↷ Rétablissement');
            } else {
                showToast('Rien à rétablir', 'error');
            }
        }

        // Écouter les raccourcis clavier
        document.addEventListener('keydown', function(e) {
            // Cmd+Z (Mac) ou Ctrl+Z (Windows/Linux) pour Undo
            if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                undo();
            }
            // Cmd+Y (Mac) ou Ctrl+Y (Windows/Linux) pour Redo
            // Ou Cmd+Shift+Z (Mac) ou Ctrl+Shift+Z (Windows/Linux)
            else if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
                e.preventDefault();
                redo();
            }
        });

        // ========================================
        // Système d'édition inline pour titre et sous-titre
        // ========================================

        // Fonction pour initialiser l'édition inline (permet de modifier en cliquant)
        function initInlineEditing() {
            const title = document.getElementById('main-title');
            const subtitle = document.getElementById('main-subtitle');

            // Fonction pour rendre un élément éditable
            function makeEditable(element, storageKey) {
                // Éviter de réattacher les event listeners si déjà initialisé
                if (element.dataset.editingInitialized) return;
                element.dataset.editingInitialized = 'true';

                // Charger la valeur sauvegardée depuis le navigateur (localStorage)
                const savedValue = appStorage.getItem(storageKey);
                if (savedValue) {
                    element.textContent = savedValue;
                }

                // Activer l'édition au clic
                element.addEventListener('click', function() {
                    // Stocker la valeur originale pour comparaison
                    element.dataset.originalValue = element.textContent.trim();

                    element.contentEditable = true;
                    element.focus({preventScroll: true});

                    // Sélectionner tout le texte pour faciliter l'édition
                    const range = document.createRange();
                    range.selectNodeContents(element);
                    const selection = window.getSelection();
                    selection.removeAllRanges();
                    selection.addRange(range);
                });

                // Sauvegarder quand on perd le focus (clic ailleurs)
                element.addEventListener('blur', function() {
                    element.contentEditable = false;
                    const newValue = element.textContent.trim();
                    const originalValue = element.dataset.originalValue || '';

                    if (newValue) {
                        appStorage.setItem(storageKey, newValue);

                        // N'afficher le toast que si la valeur a changé
                        if (newValue !== originalValue) {
                            showToast('✅ Modification sauvegardée');
                        }
                    }
                });

                // Sauvegarder aussi quand on appuie sur Enter
                element.addEventListener('keydown', function(e) {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault(); // Empêcher le retour à la ligne
                        element.blur(); // Déclencher la sauvegarde
                    }
                    // Echap pour annuler l'édition
                    if (e.key === 'Escape') {
                        element.textContent = appStorage.getItem(storageKey) || element.textContent;
                        element.blur();
                    }
                });
            }

            // Initialiser l'édition pour le titre et le sous-titre
            makeEditable(title, 'analysis-main-title');
            makeEditable(subtitle, 'analysis-main-subtitle');

        }

        // Lancer l'initialisation quand le DOM est prêt
        document.addEventListener('DOMContentLoaded', initInlineEditing);

        // ========================================
        // Mode Présentation
        // ========================================

        function togglePresentation() {
            document.body.classList.toggle('presentation-mode');
            var btn = document.getElementById('pres-toggle');
            var active = document.body.classList.contains('presentation-mode');
            btn.classList.toggle('active', active);
            btn.textContent = active ? '✏️ Édition' : '🖥️ Présentation';
        }

        // ========================================
        // Toggle sticky mode
        // ========================================

        function toggleSticky() {
            const stickySection = document.getElementById('sticky-section');
            const toggleBtn = document.getElementById('sticky-toggle-btn');

            // Toggle : si active, on désactive ; si inactif, on active
            const isCurrentlyActive = toggleBtn.classList.contains('active');

            if (isCurrentlyActive) {
                // Désactiver sticky
                toggleBtn.classList.remove('active');
                stickySection.classList.add('sticky-disabled');
                appStorage.setItem('sticky-enabled', 'false');
            } else {
                // Activer sticky
                toggleBtn.classList.add('active');
                stickySection.classList.remove('sticky-disabled');
                appStorage.setItem('sticky-enabled', 'true');
            }
        }

        // Restaurer l'état du sticky au chargement (LOGIQUE INVERSÉE)
        document.addEventListener('DOMContentLoaded', function() {
            const stickyEnabled = appStorage.getItem('sticky-enabled');
            const stickySection = document.getElementById('sticky-section');
            const toggleBtn = document.getElementById('sticky-toggle-btn');

            // Par défaut, sticky désactivé si pas de préférence
            if (stickyEnabled === 'true') {
                // Sticky activé = bouton vert (active) et section sticky
                toggleBtn.classList.add('active');
                stickySection.classList.remove('sticky-disabled');
            } else {
                // Sticky désactivé par défaut = bouton gris et section non-sticky
                toggleBtn.classList.remove('active');
                stickySection.classList.add('sticky-disabled');
            }
        });

        // ========================================
        // Système de collapse (plier/déplier) pour les sections
        // ========================================

        function toggleCollapse(contentId) {
            const content = document.getElementById(contentId);
            const header = content.previousElementSibling;

            // Toggle des classes (ajouter ou retirer la classe 'collapsed')
            header.classList.toggle('collapsed');
            content.classList.toggle('collapsed');

            // Sauvegarder l'état dans localStorage pour mémoriser la préférence
            const isCollapsed = content.classList.contains('collapsed');
            appStorage.setItem(`collapse-${contentId}`, isCollapsed);
        }

        // Restaurer l'état des sections au chargement de la page
        document.addEventListener('DOMContentLoaded', function() {
            // Restaurer l'état des matrices
            const matricesContent = document.getElementById('matrices-content');
            const isCollapsedMatrices = appStorage.getItem('collapse-matrices-content') === 'true';

            if (isCollapsedMatrices && matricesContent) {
                const header = matricesContent.previousElementSibling;
                header.classList.add('collapsed');
                matricesContent.classList.add('collapsed');
            }

            // Restaurer l'état de la section sticky complète
            const stickySectionContent = document.getElementById('sticky-section-content');
            const isCollapsedSticky = appStorage.getItem('collapse-sticky-section-content') === 'true';

            if (isCollapsedSticky && stickySectionContent) {
                const header = stickySectionContent.previousElementSibling;
                header.classList.add('collapsed');
                stickySectionContent.classList.add('collapsed');
            }
        });

        // ========================================
        // Édition inline des éléments de groupes et risques
        // ========================================

        function initGroupNameEditing() {
            // Cette fonction sera appelée après le rendu des groupes
            document.querySelectorAll('.editable-group-name').forEach(element => {
                // Éviter de réattacher les event listeners si déjà initialisé
                if (element.dataset.editingInitialized) return;
                element.dataset.editingInitialized = 'true';

                const groupId = element.getAttribute('data-group-id');
                const storageKey = `group-name-${groupId}`;

                // Charger la valeur sauvegardée
                const savedValue = appStorage.getItem(storageKey);
                if (savedValue) {
                    element.textContent = savedValue;
                    // Mettre à jour aussi dans l'objet riskGroups
                    const group = riskGroups.find(g => g.id == groupId);
                    if (group) {
                        group.name = savedValue;
                    }
                }

                // Activer l'édition au clic
                element.addEventListener('click', function(e) {
                    e.stopPropagation(); // Empêcher la propagation au header

                    // Stocker la valeur originale pour comparaison
                    element.dataset.originalValue = element.textContent.trim();

                    element.contentEditable = true;
                    element.focus({preventScroll: true});

                    // Sélectionner tout le texte
                    const range = document.createRange();
                    range.selectNodeContents(element);
                    const selection = window.getSelection();
                    selection.removeAllRanges();
                    selection.addRange(range);
                });

                // Sauvegarder quand on perd le focus
                element.addEventListener('blur', function() {
                    element.contentEditable = false;
                    const newValue = element.textContent.trim();
                    const originalValue = element.dataset.originalValue || '';

                    if (newValue) {
                        appStorage.setItem(storageKey, newValue);
                        // Mettre à jour dans l'objet riskGroups
                        const group = riskGroups.find(g => g.id == groupId);
                        if (group) {
                            group.name = newValue;
                        }
                        // Rafraîchir les graphiques et tableaux pour refléter le changement
                        updateGantt();

                        // N'afficher le toast que si la valeur a changé
                        if (newValue !== originalValue) {
                            showToast('✅ Modification sauvegardée');
                        }
                    }
                });

                // Sauvegarder avec Enter
                element.addEventListener('keydown', function(e) {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        element.blur();
                    }
                    // Annuler avec Escape
                    if (e.key === 'Escape') {
                        element.textContent = appStorage.getItem(storageKey) || element.textContent;
                        element.blur();
                    }
                });
            });
        }

        function initGroupDescriptionEditing() {
            // Cette fonction sera appelée après le rendu des groupes
            document.querySelectorAll('.editable-group-description').forEach(element => {
                // Éviter de réattacher les event listeners si déjà initialisé
                if (element.dataset.editingInitialized) return;
                element.dataset.editingInitialized = 'true';

                const groupId = element.getAttribute('data-group-id');
                const storageKey = `group-desc-${groupId}`;

                // Charger la valeur sauvegardée
                const savedValue = appStorage.getItem(storageKey);
                if (savedValue) {
                    element.textContent = savedValue;
                    const group = riskGroups.find(g => g.id == groupId);
                    if (group) {
                        group.description = savedValue;
                    }
                }

                // Activer l'édition au clic
                element.addEventListener('click', function(e) {
                    e.stopPropagation();

                    // Stocker la valeur originale pour comparaison
                    element.dataset.originalValue = element.textContent.trim();

                    element.contentEditable = true;
                    element.focus({preventScroll: true});

                    const range = document.createRange();
                    range.selectNodeContents(element);
                    const selection = window.getSelection();
                    selection.removeAllRanges();
                    selection.addRange(range);
                });

                // Sauvegarder quand on perd le focus
                element.addEventListener('blur', function() {
                    element.contentEditable = false;
                    const newValue = element.textContent.trim();
                    const originalValue = element.dataset.originalValue || '';

                    if (newValue) {
                        appStorage.setItem(storageKey, newValue);
                        const group = riskGroups.find(g => g.id == groupId);
                        if (group) {
                            group.description = newValue;
                        }

                        // N'afficher le toast que si la valeur a changé
                        if (newValue !== originalValue) {
                            showToast('✅ Modification sauvegardée');
                        }
                    }
                });

                // Sauvegarder avec Enter
                element.addEventListener('keydown', function(e) {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        element.blur();
                    }
                    if (e.key === 'Escape') {
                        element.textContent = appStorage.getItem(storageKey) || element.textContent;
                        element.blur();
                    }
                });
            });
        }

        function initRiskTitleEditing() {
            // Cette fonction sera appelée après le rendu des risques
            document.querySelectorAll('.editable-risk-title').forEach(element => {
                // Éviter de réattacher les event listeners si déjà initialisé
                if (element.dataset.editingInitialized) return;
                element.dataset.editingInitialized = 'true';

                const riskId = element.getAttribute('data-risk-id');
                const storageKey = `risk-title-${riskId}`;

                // Charger la valeur sauvegardée
                const savedValue = appStorage.getItem(storageKey);
                if (savedValue) {
                    element.textContent = savedValue;
                    const risk = risks.find(r => r.id === riskId);
                    if (risk) {
                        risk.title = savedValue.replace(`${riskId}. `, '');
                    }
                }

                // Activer l'édition au clic
                element.addEventListener('click', function(e) {
                    e.stopPropagation();
                    e.preventDefault();

                    // Stocker la valeur originale pour comparaison
                    element.dataset.originalValue = element.textContent.trim();

                    // Désactiver le drag sur la ligne parente pendant l'édition
                    const row = element.closest('tr');
                    if (row) {
                        row.draggable = false;
                    }

                    element.contentEditable = true;
                    element.focus({preventScroll: true});

                    const range = document.createRange();
                    range.selectNodeContents(element);
                    const selection = window.getSelection();
                    selection.removeAllRanges();
                    selection.addRange(range);
                });

                // Sauvegarder quand on perd le focus
                element.addEventListener('blur', function() {
                    element.contentEditable = false;

                    // Réactiver le drag sur la ligne parente
                    const row = element.closest('tr');
                    if (row) {
                        row.draggable = true;
                    }

                    const newValue = element.textContent.trim();
                    const originalValue = element.dataset.originalValue || '';

                    if (newValue) {
                        appStorage.setItem(storageKey, newValue);
                        const risk = risks.find(r => r.id === riskId);
                        if (risk) {
                            risk.title = newValue.replace(`${riskId}. `, '');
                        }
                        updateGantt();

                        // N'afficher le toast que si la valeur a changé
                        if (newValue !== originalValue) {
                            showToast('✅ Modification sauvegardée');
                        }
                    }
                });

                // Sauvegarder avec Enter
                element.addEventListener('keydown', function(e) {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        element.blur();
                    }
                    if (e.key === 'Escape') {
                        element.textContent = appStorage.getItem(storageKey) || element.textContent;
                        element.blur();
                    }
                });
            });
        }

        // ========================================
        // Édition inline des remédiations
        // ========================================

        function initRemediationEditing() {
            document.querySelectorAll('.editable-remediation').forEach(element => {
                // Éviter de réattacher les event listeners si déjà initialisé
                if (element.dataset.editingInitialized) return;
                element.dataset.editingInitialized = 'true';

                const riskId = element.getAttribute('data-risk-id');
                const storageKey = `risk-remediation-${riskId}`;

                // Charger la valeur sauvegardée
                const savedValue = appStorage.getItem(storageKey);
                if (savedValue) {
                    element.textContent = savedValue;
                    const risk = risks.find(r => r.id === riskId);
                    if (risk) {
                        // Convertir le texte en tableau de mesures (séparé par •)
                        risk.mesures = savedValue.split(' • ').map(m => m.trim()).filter(m => m);
                    }
                }

                // Activer l'édition au clic
                element.addEventListener('click', function(e) {
                    e.stopPropagation();
                    e.preventDefault();

                    // Stocker la valeur originale pour comparaison
                    element.dataset.originalValue = element.textContent.trim();

                    // Désactiver le drag sur la ligne parente pendant l'édition
                    const row = element.closest('tr');
                    if (row) {
                        row.draggable = false;
                    }

                    element.contentEditable = true;
                    element.focus({preventScroll: true});

                    const range = document.createRange();
                    range.selectNodeContents(element);
                    const selection = window.getSelection();
                    selection.removeAllRanges();
                    selection.addRange(range);
                });

                // Sauvegarder quand on perd le focus
                element.addEventListener('blur', function() {
                    element.contentEditable = false;

                    // Réactiver le drag sur la ligne parente
                    const row = element.closest('tr');
                    if (row) {
                        row.draggable = true;
                    }

                    const newValue = element.textContent.trim();
                    const originalValue = element.dataset.originalValue || '';

                    if (newValue && newValue !== t('clickToAddRemediation')) {
                        appStorage.setItem(storageKey, newValue);
                        const risk = risks.find(r => r.id === riskId);
                        if (risk) {
                            // Convertir le texte en tableau de mesures (séparé par •)
                            risk.mesures = newValue.split(' • ').map(m => m.trim()).filter(m => m);
                        }

                        // N'afficher le toast que si la valeur a changé
                        if (newValue !== originalValue) {
                            showToast('✅ Modification sauvegardée');
                        }
                    }
                });

                // Sauvegarder avec Enter
                element.addEventListener('keydown', function(e) {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        element.blur();
                    }
                    if (e.key === 'Escape') {
                        element.textContent = appStorage.getItem(storageKey) || element.textContent;
                        element.blur();
                    }
                });
            });
        }

        // ========================================
        // Gestion des dropdowns de statut
        // ========================================

        function initStatusDropdowns() {
            document.querySelectorAll('.status-dropdown').forEach(dropdown => {
                // Éviter de réattacher les event listeners si déjà initialisé
                if (dropdown.dataset.listenerInitialized) return;
                dropdown.dataset.listenerInitialized = 'true';

                const riskId = dropdown.getAttribute('data-risk-id');

                // Charger la valeur sauvegardée depuis localStorage
                const storageKey = `risk-status-${riskId}`;
                const savedStatus = appStorage.getItem(storageKey);
                if (savedStatus) {
                    dropdown.value = savedStatus;
                    const risk = risks.find(r => r.id === riskId);
                    if (risk) {
                        risk.statut = savedStatus;
                    }
                }

                // Écouter les changements de statut
                dropdown.addEventListener('change', function(e) {
                    const newStatus = e.target.value;

                    // Sauvegarder dans localStorage
                    appStorage.setItem(storageKey, newStatus);

                    // Mettre à jour l'objet risque
                    const risk = risks.find(r => r.id === riskId);
                    if (risk) {
                        risk.statut = newStatus;
                    }

                    // Mettre à jour le dashboard
                    updateDashboard();

                    showToast('✅ Statut mis à jour');
                });
            });
        }

        // ========================================
        // Édition inline du champ Responsable
        // ========================================

        function initResponsableEditing() {
            document.querySelectorAll('.editable-responsable').forEach(element => {
                // Éviter de réattacher les event listeners si déjà initialisé
                if (element.dataset.editingInitialized) return;
                element.dataset.editingInitialized = 'true';

                const riskId = element.getAttribute('data-risk-id');
                const storageKey = `risk-responsable-${riskId}`;

                // Charger la valeur sauvegardée
                const savedValue = appStorage.getItem(storageKey);
                if (savedValue) {
                    element.textContent = savedValue;
                    const risk = risks.find(r => r.id === riskId);
                    if (risk) {
                        risk.responsable = savedValue;
                    }
                }

                // Activer l'édition au clic
                element.addEventListener('click', function(e) {
                    e.stopPropagation();
                    e.preventDefault();

                    // Stocker la valeur originale pour comparaison
                    element.dataset.originalValue = element.textContent.trim();

                    // Désactiver le drag sur la ligne parente pendant l'édition
                    const row = element.closest('tr');
                    if (row) {
                        row.draggable = false;
                    }

                    element.contentEditable = true;
                    element.focus({preventScroll: true});

                    const range = document.createRange();
                    range.selectNodeContents(element);
                    const selection = window.getSelection();
                    selection.removeAllRanges();
                    selection.addRange(range);
                });

                // Sauvegarder quand on perd le focus
                element.addEventListener('blur', function() {
                    element.contentEditable = false;

                    // Réactiver le drag sur la ligne parente
                    const row = element.closest('tr');
                    if (row) {
                        row.draggable = true;
                    }

                    const newValue = element.textContent.trim();
                    const originalValue = element.dataset.originalValue || '';

                    // Si vide, afficher le placeholder
                    if (!newValue || newValue === t('clickToAdd')) {
                        element.textContent = t('clickToAdd');
                        appStorage.removeItem(storageKey);
                        const risk = risks.find(r => r.id === riskId);
                        if (risk) {
                            risk.responsable = '';
                        }
                    } else {
                        appStorage.setItem(storageKey, newValue);
                        const risk = risks.find(r => r.id === riskId);
                        if (risk) {
                            risk.responsable = newValue;
                        }

                        // N'afficher le toast que si la valeur a changé
                        if (newValue !== originalValue) {
                            showToast('✅ Modification sauvegardée');
                        }
                    }
                });

                // Sauvegarder avec Enter
                element.addEventListener('keydown', function(e) {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        element.blur();
                    }
                    if (e.key === 'Escape') {
                        element.textContent = appStorage.getItem(storageKey) || t('clickToAdd');
                        element.blur();
                    }
                });
            });
        }

        // ========================================
        // Édition inline des sous-titres de sections
        // ========================================

        function initSectionTitleEditing() {
            // Cette fonction sera appelée après le rendu des risques
            document.querySelectorAll('.editable-section-title').forEach(element => {
                // Éviter de réattacher les event listeners si déjà initialisé
                if (element.dataset.editingInitialized) return;
                element.dataset.editingInitialized = 'true';

                const riskIndex = element.getAttribute('data-risk-index');
                const sectionType = element.getAttribute('data-section-type');
                const storageKey = `section-title-${riskIndex}-${sectionType}`;

                // Charger la valeur sauvegardée
                const savedValue = appStorage.getItem(storageKey);
                if (savedValue) {
                    element.textContent = savedValue;
                }

                // Activer l'édition au clic
                element.addEventListener('click', function(e) {
                    e.stopPropagation();

                    // Stocker la valeur originale pour comparaison
                    element.dataset.originalValue = element.textContent.trim();

                    element.contentEditable = true;
                    element.focus({preventScroll: true});
                    // Sélectionner tout le texte
                    const range = document.createRange();
                    range.selectNodeContents(element);
                    const selection = window.getSelection();
                    selection.removeAllRanges();
                    selection.addRange(range);
                });

                // Sauvegarder quand on perd le focus
                element.addEventListener('blur', function() {
                    element.contentEditable = false;
                    const newValue = element.textContent.trim();
                    const originalValue = element.dataset.originalValue || '';

                    if (newValue) {
                        appStorage.setItem(storageKey, newValue);

                        // N'afficher le toast que si la valeur a changé
                        if (newValue !== originalValue) {
                            showToast('✅ Modification sauvegardée');
                        }
                    }
                });

                // Sauvegarder avec Enter
                element.addEventListener('keydown', function(e) {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        element.blur();
                    }
                    // Annuler avec Escape
                    if (e.key === 'Escape') {
                        element.textContent = appStorage.getItem(storageKey) || element.textContent;
                        element.blur();
                    }
                });
            });
        }

        // ========================================
        // Édition inline des dates de tâches
        // ========================================

        function initDateEditing() {
            document.querySelectorAll('.editable-date').forEach(input => {
                // Éviter de réattacher les event listeners si déjà initialisé
                if (input.dataset.editingInitialized) return;
                input.dataset.editingInitialized = 'true';

                const riskId = input.dataset.riskId;
                const dateType = input.dataset.dateType; // 'startDate' or 'endDate'

                input.addEventListener('change', function() {
                    const newValue = this.value;

                    // Sauvegarder l'état avant modification
                    saveState();

                    // Trouver la tâche
                    const task = risks.find(r => r.id === riskId);
                    if (!task) return;

                    // Mettre à jour la date
                    task[dateType] = newValue;

                    // Mettre à jour le span d'affichage français
                    var displaySpan = input.previousElementSibling;
                    if (displaySpan && displaySpan.classList.contains('date-display')) {
                        displaySpan.textContent = formatDateFR(newValue);
                    }

                    // Recalculer la durée (jours ouvrés)
                    if (task.startDate && task.endDate) {
                        task.duration = workingDaysBetween(task.startDate, task.endDate);

                        // Mettre à jour l'affichage de la durée
                        const index = risks.findIndex(r => r.id === riskId);
                        const durationCell = document.getElementById(`duration-${index}`);
                        if (durationCell) {
                            durationCell.textContent = task.duration;
                        }
                    }

                    // Mettre à jour les dates de la phase parente
                    const phaseId = parseInt(riskId.split('.')[0]);
                    const phase = phases.find(p => p.id === phaseId);
                    if (phase) {
                        updatePhaseDates(phase);
                    }

                    // Cascade des dépendances + chemin critique (v2.1)
                    const shifted = applyDependencyCascade({});
                    recomputeCriticalPath();
                    if (shifted > 0) renderPlanning();

                    // Mettre à jour le Gantt
                    updateGantt();
                    updateDashboard();

                });
            });
        }

        // ========================================
        // Fonction d'export vers fichier HTML
        // ========================================

        function exportToHTML() {
            // Récupérer les valeurs modifiées depuis localStorage
            const savedTitle = appStorage.getItem('analysis-main-title');
            const savedSubtitle = appStorage.getItem('analysis-main-subtitle');

            // Récupérer le contenu HTML complet de la page
            let htmlContent = document.documentElement.outerHTML;

            // Remplacer le titre par la valeur sauvegardée (si elle existe)
            if (savedTitle) {
                const titleElement = document.getElementById('main-title');
                const originalTitle = 'Plannr - Planning de Projet';
                // Remplacer l'ancien titre par le nouveau dans le HTML
                htmlContent = htmlContent.replace(
                    `<h1 id="main-title" class="editable-title">${originalTitle}</h1>`,
                    `<h1 id="main-title" class="editable-title">${savedTitle}</h1>`
                );
                // Remplacer aussi si le titre a déjà été modifié
                const currentTitle = titleElement.textContent;
                htmlContent = htmlContent.replace(
                    `<h1 id="main-title" class="editable-title">${currentTitle}</h1>`,
                    `<h1 id="main-title" class="editable-title">${savedTitle}</h1>`
                );
            }

            // Remplacer le sous-titre par la valeur sauvegardée (si elle existe)
            if (savedSubtitle) {
                const subtitleElement = document.getElementById('main-subtitle');
                const originalSubtitle = 'Évaluation des risques avant et après remédiation';
                // Remplacer l'ancien sous-titre par le nouveau dans le HTML
                htmlContent = htmlContent.replace(
                    `style="color: #666; margin-bottom: 20px;">${originalSubtitle}</p>`,
                    `style="color: #666; margin-bottom: 20px;">${savedSubtitle}</p>`
                );
                // Remplacer aussi si le sous-titre a déjà été modifié
                const currentSubtitle = subtitleElement.textContent;
                htmlContent = htmlContent.replace(
                    `style="color: #666; margin-bottom: 20px;">${currentSubtitle}</p>`,
                    `style="color: #666; margin-bottom: 20px;">${savedSubtitle}</p>`
                );
            }

            // Créer un Blob (objet fichier en mémoire) avec le contenu HTML
            const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });

            // Créer un lien de téléchargement temporaire
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);

            // Générer un nom de fichier avec date et heure
            const now = new Date();
            const dateStr = now.toISOString().slice(0, 10); // Format: YYYY-MM-DD
            const timeStr = now.toTimeString().slice(0, 5).replace(':', 'h'); // Format: HHhMM
            link.download = `analyse_risque_v2_export_${dateStr}_${timeStr}.html`;

            // Ajouter le lien au document, cliquer dessus, puis le retirer
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            // Libérer la mémoire du Blob
            URL.revokeObjectURL(link.href);

        }

        // ========================================
        // Fonction de dispatch pour les exports
        // ========================================

        function handleExport(format) {
            if (!format) return;

            switch(format) {
                case 'pdf':
                    exportToPDF();
                    break;
                case 'excel':
                    exportToExcel();
                    break;
                case 'csv':
                    exportToCSV();
                    break;
                case 'html':
                    exportToHTML(); // Export HTML autonome
                    break;
                case 'json':
                    exportDataToJSON(); // Export Données JSON (format canonique)
                    break;
                case 'datajs':
                    exportDataJsFile(); // Sauvegarde plannr-data.js rechargeable
                    break;
                case 'ics':
                    exportToICS(); // Jalons -> événements calendrier (v2.1)
                    break;
            }

            // Réinitialiser le sélecteur
            document.getElementById('export-format-selector').value = '';
        }
        
        // ========================================
        // Export Données — format canonique PLANNR_DATA
        // ========================================
        // Format canonique de Plannr (hiérarchique) : riskGroups[].tasks.
        // C'est LE format unique partagé par plannr-data.js, l'export JSON
        // et l'import — le round-trip est garanti par construction.
        function buildCanonicalData() {
            return {
                version: "2.1",
                timestamp: new Date().toISOString(),
                appState: {
                    title: document.getElementById('main-title').textContent,
                    subtitle: document.getElementById('main-subtitle').textContent,
                    language: currentLanguage
                },
                // Structure hiérarchique complète : phases avec tasks.
                // Clé canonique v2.1 : `phases` — la lecture (loader, import,
                // reload) accepte aussi l'ancienne clé `riskGroups`.
                phases: riskGroups,
                // Baseline incluse si figée (undefined = clé omise au stringify)
                baseline: baselineData || undefined
            };
        }

        function downloadTextFile(content, filename, mime) {
            const blob = new Blob([content], { type: mime });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }

        function exportDataToJSON() {
            const dateStr = new Date().toISOString().slice(0, 10);
            downloadTextFile(JSON.stringify(buildCanonicalData(), null, 2),
                `plannr_data_${dateStr}.json`, 'application/json');
        }

        // Sauvegarde directe au format plannr-data.js : le fichier téléchargé
        // se repose tel quel à côté de plannr.html et est chargé au prochain
        // rechargement (ou via le bouton de rechargement des données) —
        // ferme la boucle d'édition (localStorage -> fichier).
        function exportDataJsFile() {
            const content = '// plannr-data.js — Données du planning Plannr\n' +
                '// Généré depuis plannr.html le ' + new Date().toISOString() + '\n' +
                '// Reposer ce fichier à côté de plannr.html (même dossier).\n' +
                'window.PLANNR_DATA = ' + JSON.stringify(buildCanonicalData(), null, 2) + ';\n';
            downloadTextFile(content, 'plannr-data.js', 'text/javascript');
            if (typeof showToast === 'function') showToast('plannr-data.js généré');
        }

        // ========================================
        // Import Données JSON
        // ========================================
        function importFromJSON(input) {
            const file = input.files[0];
            if (!file) return;

            const reader = new FileReader();
            
            reader.onload = function(e) {
                try {
                    const data = JSON.parse(e.target.result);
                    
                    // Validation basique — accepte la clé canonique v2.1
                    // `phases` ET la clé legacy `riskGroups`
                    const importedPhases = data.phases || data.riskGroups;
                    if (!importedPhases || !Array.isArray(importedPhases)) {
                        throw new Error("Format JSON invalide : 'phases' (ou 'riskGroups') manquant ou incorrect");
                    }

                    // 1. Restaurer l'état de l'application
                    if (data.appState) {
                        if (data.appState.title) {
                            document.getElementById('main-title').textContent = data.appState.title;
                            appStorage.setItem('analysis-main-title', data.appState.title);
                        }
                        if (data.appState.subtitle) {
                            document.getElementById('main-subtitle').textContent = data.appState.subtitle;
                            appStorage.setItem('analysis-main-subtitle', data.appState.subtitle);
                        }
                        if (data.appState.language) {
                            setLanguage(data.appState.language);
                        }
                    }

                    // 2. Restaurer les groupes
                    // On vide le tableau existant et on remplit avec les nouvelles données
                    riskGroups.length = 0;
                    riskGroups.push(...importedPhases);

                    // 3. Reconstruire le tableau global 'risks' à partir des groupes
                    // C'est CRUCIAL pour que risks et riskGroups soient synchronisés (mêmes références d'objets)
                    risks.length = 0;
                    riskGroups.forEach(group => {
                        if (group.tasks && Array.isArray(group.tasks)) {
                            group.tasks.forEach(risk => {
                                risks.push(risk);
                            });
                        }
                    });

                    // 4. Sauvegarder l'état pour undo/redo
                    saveState();
                    
                    // 5. Mettre à jour le mapping dans localStorage
                    saveGroupMapping();

                    // 6. Rafraîchir l'interface
                    renderPlanning();
                    updateGantt();

                    showToast('✅ Données importées avec succès !');
                    
                } catch (error) {
                    console.error('Erreur lors de l\'import:', error);
                    alert('Erreur lors de l\'import du fichier JSON :\n' + error.message);
                } finally {
                    // Reset l'input pour permettre de réimporter le même fichier si besoin
                    input.value = '';
                }
            };

            reader.readAsText(file);
        }

        // ========================================
        // Export PDF avec jsPDF
        // ========================================

        function exportToPDF() {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();

            const title = document.getElementById('main-title').textContent;
            const subtitle = document.getElementById('main-subtitle').textContent;

            // Titre du document
            doc.setFontSize(18);
            doc.text(title, 105, 20, { align: 'center' });
            doc.setFontSize(12);
            doc.text(subtitle, 105, 30, { align: 'center' });

            let yPosition = 40;

            // Ajouter le diagramme de Gantt sur la première page
            doc.setFontSize(14);
            doc.setFont(undefined, 'bold');
            doc.text('Diagramme de Gantt', 105, yPosition, { align: 'center' });
            yPosition += 10;

            // Capturer le canvas du Gantt et l'ajouter au PDF
            const ganttCanvas = document.getElementById('ganttChart');

            if (ganttCanvas) {
                try {
                    const imgGantt = ganttCanvas.toDataURL('image/png');
                    // Ajuster la taille de l'image pour qu'elle tienne dans la page (A4 fait environ 210mm de large)
                    doc.addImage(imgGantt, 'PNG', 15, yPosition, 180, 100);
                    yPosition += 110;
                } catch (e) {
                    console.error('Erreur lors de la capture du Gantt:', e);
                    yPosition += 10;
                }
            } else {
                yPosition += 10;
            }

            // Pour chaque groupe de risques
            riskGroups.forEach((group, groupIndex) => {
                if (yPosition > 250) {
                    doc.addPage();
                    yPosition = 20;
                }

                // Titre du groupe
                doc.setFontSize(14);
                doc.setFont(undefined, 'bold');
                doc.text(`${groupIndex + 1}. ${group.name}`, 15, yPosition);
                yPosition += 10;

                if (group.tasks && group.tasks.length > 0) {
                    // Préparer les données pour le tableau
                    const tableData = group.tasks.map(risk => {
                        return [
                            risk.id,
                            risk.title,
                            risk.startDate || '-',
                            risk.endDate || '-',
                            risk.duration ? risk.duration + 'j' : '-',
                            risk.statut || '-',
                            risk.responsable || '-'
                        ];
                    });

                    // Créer le tableau avec autoTable
                    doc.autoTable({
                        startY: yPosition,
                        head: [['#', 'Tâche', 'Début', 'Fin', 'Durée', 'Statut', 'Responsable']],
                        body: tableData,
                        theme: 'grid',
                        styles: { fontSize: 9, cellPadding: 3 },
                        headStyles: { fillColor: [0, 113, 227], textColor: 255 },
                        columnStyles: {
                            0: { cellWidth: 10 },
                            1: { cellWidth: 80 }, // Tâche plus large
                            2: { cellWidth: 20 },
                            3: { cellWidth: 20 },
                            4: { cellWidth: 15 },
                            5: { cellWidth: 20 },
                            6: { cellWidth: 25 }
                        }
                    });

                    yPosition = doc.lastAutoTable.finalY + 10;
                } else {
                    doc.setFont(undefined, 'normal');
                    doc.setFontSize(10);
                    doc.text('Aucune tâche', 20, yPosition);
                    yPosition += 10;
                }
            });

            // Télécharger le PDF
            const now = new Date();
            const dateStr = now.toISOString().slice(0, 10);
            doc.save(`plannr_export_${dateStr}.pdf`);

        }

        // ========================================
        // Export Excel (XLSX) avec SheetJS
        // ========================================

        function exportToExcel() {
            const wb = XLSX.utils.book_new();

            // Créer une feuille par groupe
            riskGroups.forEach(group => {
                const sheetData = [];

                // En-têtes
                sheetData.push(['#', 'Tâche', 'Début', 'Fin', 'Durée (j)', 'Statut', 'Responsable']);

                // Données des tâches
                group.tasks.forEach(risk => {
                    sheetData.push([
                        risk.id,
                        risk.title,
                        risk.startDate || '',
                        risk.endDate || '',
                        risk.duration || '',
                        risk.statut || '',
                        risk.responsable || ''
                    ]);
                });

                const ws = XLSX.utils.aoa_to_sheet(sheetData);

                // Largeur des colonnes
                ws['!cols'] = [
                    { wch: 5 },  // #
                    { wch: 50 }, // Tâche
                    { wch: 12 }, // Début
                    { wch: 12 }, // Fin
                    { wch: 10 }, // Durée
                    { wch: 15 }, // Statut
                    { wch: 20 }  // Responsable
                ];

                // Nom de l'onglet nettoyé (max 31 chars)
                let sheetName = (group.id + ". " + group.name).substring(0, 31).replace(/[/\\?*\[\]]/g, "");
                XLSX.utils.book_append_sheet(wb, ws, sheetName);
            });

            // Télécharger le fichier Excel
            const now = new Date();
            const dateStr = now.toISOString().slice(0, 10);
            XLSX.writeFile(wb, `plannr_export_${dateStr}.xlsx`);

        }

        // ========================================
        // Export CSV
        // ========================================

                function exportToCSV() {
                    let csvContent = "data:text/csv;charset=utf-8,";
                    
                    // En-tête CSV
                    csvContent += '#,Groupe,Tâche,Début,Fin,Durée,Statut,Responsable\n';
        
                    riskGroups.forEach(group => {
                        group.tasks.forEach(risk => {
                            const row = [
                                risk.id,
                                `"${(group.name || '').replace(/"/g, '""')}"`,
                                `"${(risk.title || '').replace(/"/g, '""')}"`,
                                risk.startDate || '',
                                risk.endDate || '',
                                risk.duration || '',
                                `"${(risk.statut || '').replace(/"/g, '""')}"`,
                                `"${(risk.responsable || '').replace(/"/g, '""')}"`
                            ];
                            csvContent += row.join(',') + '\n';
                        });
                    });
        
                    const encodedUri = encodeURI(csvContent);
                    const link = document.createElement("a");
                    link.setAttribute("href", encodedUri);
                    const now = new Date();
                    const dateStr = now.toISOString().slice(0, 10);
                    link.setAttribute("download", `plannr_export_${dateStr}.csv`);
                    document.body.appendChild(link); // Requis pour Firefox
                    link.click();
                    document.body.removeChild(link);
                }
        // ========================================
        // Système multilingue
        // ========================================

        const translations = {
            fr: {
                // Titre et sous-titre
                pageTitle: "Plannr - Planning de Projet",
                pageSubtitle: "Gestion des phases et tâches",

                // Boutons principaux
                exportBtn: "Exporter",
                exportTooltip: "Télécharger une copie avec vos modifications",
                undoBtn: "Annuler",
                undoTooltip: "Annuler la dernière action (Cmd/Ctrl+Z)",
                redoBtn: "Refaire",
                redoTooltip: "Refaire l'action annulée (Cmd/Ctrl+Y)",

                // Dashboard
                dashboardTitle: "Vue d'ensemble",
                dashboardTotalTasks: "Tâches totales",
                dashboardTasksInProgress: "En cours",
                dashboardTasksCompleted: "Terminées",
                dashboardTotalDuration: "Durée totale",

                // Sections
                ganttTitle: "Diagramme de Gantt",
                taskTableTitle: "Tableau des Tâches",

                // Tableau récap
                colNumber: "N°",
                colDescription: "Tâche",
                colStartDate: "Date début",
                colEndDate: "Date fin",
                colDuration: "Durée (j)",

                // Colonnes tableau
                colTask: "Tâche",
                colBefore: "AVANT",
                colAfter: "APRÈS",
                colStatus: "Statut",
                colResp: "Responsable",

                // Labels axes Gantt
                axisTime: "Temps →",
                axisPhases: "↑ Phases",

                // Statuts
                statusTodo: "À faire",
                statusInProgress: "En cours",
                statusDone: "Terminé",
                statusBlocked: "Bloqué",
                statusDelayed: "En retard",
                // Alias pour compatibilité
                statusNotTreated: "À faire",
                statusTreated: "Terminé",
                statusAccepted: "Accepté",

                // Badges de priorité
                priorityLow: "Basse",
                priorityMedium: "Moyenne",
                priorityHigh: "Haute",

                // Actions
                addGroup: "Ajouter une phase",
                addRisk: "Tâche",
                addMilestone: "Jalon",
                deleteGroup: "Supprimer",
                clickToAdd: "Cliquer pour ajouter",
                clickToAddRemediation: "Cliquer pour ajouter une tâche",
                zoomMatrix: "Agrandir le Gantt"
            },
            en: {
                pageTitle: "Plannr - Project Planning",
                pageSubtitle: "Manage phases and tasks",

                exportBtn: "Export",
                exportTooltip: "Download a copy with your modifications",
                undoBtn: "Undo",
                undoTooltip: "Undo last action (Cmd/Ctrl+Z)",
                redoBtn: "Redo",
                redoTooltip: "Redo undone action (Cmd/Ctrl+Y)",

                dashboardTitle: "Overview",
                dashboardTotalTasks: "Total tasks",
                dashboardTasksInProgress: "In progress",
                dashboardTasksCompleted: "Completed",
                dashboardTotalDuration: "Total duration",

                ganttTitle: "Gantt Chart",
                taskTableTitle: "Task Table",

                colNumber: "No.",
                colDescription: "Task",
                colStartDate: "Start date",
                colEndDate: "End date",
                colDuration: "Duration (d)",

                colTask: "Task",
                colBefore: "BEFORE",
                colAfter: "AFTER",
                colStatus: "Status",
                colResp: "Owner",

                axisTime: "Time →",
                axisPhases: "↑ Phases",

                statusTodo: "To do",
                statusInProgress: "In progress",
                statusDone: "Done",
                statusBlocked: "Blocked",
                statusDelayed: "Delayed",
                // Aliases for compatibility
                statusNotTreated: "To do",
                statusTreated: "Done",
                statusAccepted: "Accepted",

                priorityLow: "Low",
                priorityMedium: "Medium",
                priorityHigh: "High",

                addGroup: "Add phase",
                addRisk: "Add task",
                deleteGroup: "Delete",
                clickToAdd: "Click to add",
                clickToAddRemediation: "Click to add a task",
                zoomMatrix: "Enlarge Gantt"
            },
            es: {
                pageTitle: "Plannr - Planificación de Proyectos",
                pageSubtitle: "Gestión de fases y tareas",

                exportBtn: "Exportar",
                exportTooltip: "Descargar una copia con sus modificaciones",
                undoBtn: "Deshacer",
                undoTooltip: "Deshacer última acción (Cmd/Ctrl+Z)",
                redoBtn: "Rehacer",
                redoTooltip: "Rehacer acción deshecha (Cmd/Ctrl+Y)",

                dashboardTitle: "Vista general",
                dashboardTotalTasks: "Tareas totales",
                dashboardTasksInProgress: "En curso",
                dashboardTasksCompleted: "Completadas",
                dashboardTotalDuration: "Duración total",

                ganttTitle: "Diagrama de Gantt",
                taskTableTitle: "Tabla de Tareas",

                colNumber: "N°",
                colDescription: "Tarea",
                colStartDate: "Fecha inicio",
                colEndDate: "Fecha fin",
                colDuration: "Duración (d)",

                colTask: "Tarea",
                colStatus: "Estado",
                colResp: "Resp.",

                axisTime: "Tiempo →",
                axisPhases: "↑ Fases",

                statusTodo: "Por hacer",
                statusInProgress: "En curso",
                statusDone: "Hecho",
                statusBlocked: "Bloqueado",
                statusDelayed: "Retrasado",

                addGroup: "Agregar fase",
                addRisk: "Tarea",
                addMilestone: "Hito",
                deleteGroup: "Eliminar",
                clickToAdd: "Clic para agregar",
                clickToAddRemediation: "Clic para agregar tarea",
                zoomMatrix: "Ampliar Gantt"
            },

            zh: {
                pageTitle: "Plannr - 项目规划",
                pageSubtitle: "管理阶段和任务",

                exportBtn: "导出",
                exportTooltip: "下载带有修改的副本",
                undoBtn: "撤销",
                undoTooltip: "撤销上一步操作 (Cmd/Ctrl+Z)",
                redoBtn: "重做",
                redoTooltip: "重做已撤销的操作 (Cmd/Ctrl+Y)",

                dashboardTitle: "概览",
                dashboardTotalTasks: "总任务数",
                dashboardTasksInProgress: "进行中",
                dashboardTasksCompleted: "已完成",
                dashboardTotalDuration: "总时长",

                ganttTitle: "甘特图",
                taskTableTitle: "任务表",

                colNumber: "编号",
                colDescription: "任务",
                colStartDate: "开始日期",
                colEndDate: "结束日期",
                colDuration: "时长 (天)",

                colTask: "任务",
                colStatus: "状态",
                colResp: "负责人",

                axisTime: "时间 →",
                axisPhases: "↑ 阶段",

                statusTodo: "待办",
                statusInProgress: "进行中",
                statusDone: "已完成",
                statusBlocked: "已锁定",
                statusDelayed: "已延迟",

                addGroup: "添加阶段",
                addRisk: "任务",
                addMilestone: "里程碑",
                deleteGroup: "删除",
                clickToAdd: "点击添加",
                clickToAddRemediation: "点击添加任务",
                zoomMatrix: "放大甘特图"
            },
            ar: {
                pageTitle: "Riskr - تحليل المخاطر التفاعلي",
                pageSubtitle: "تقييم المخاطر قبل وبعد المعالجة",

                exportBtn: "تصدير",
                exportTooltip: "تنزيل نسخة مع تعديلاتك",
                undoBtn: "تراجع",
                undoTooltip: "التراجع عن الإجراء الأخير (Cmd/Ctrl+Z)",
                redoBtn: "إعادة",
                redoTooltip: "إعادة الإجراء الملغي (Cmd/Ctrl+Y)",

                dashboardTitle: "نظرة عامة",
                dashboardRisksEvaluated: "المخاطر المقيمة",
                dashboardCriticalRisks: "المخاطر الحرجة (قبل ← بعد)",
                dashboardAvgReduction: "متوسط الانخفاض",
                dashboardTreated: "المخاطر المعالجة",

                matricesTitle: "مصفوفات المخاطر",
                matrixBefore: "مصفوفة المخاطر غير المعالجة",
                matrixAfter: "مصفوفة المخاطر المعالجة",
                riskTableTitle: "جدول ملخص المخاطر",

                colNumber: "رقم",
                colDescription: "وصف المخاطرة",
                colAvgBefore: "متوسط قبل",
                colAvgAfter: "متوسط بعد",

                colRisk: "المخاطرة",
                colRemediations: "المعالجات",
                colBefore: "قبل",
                colAfter: "بعد",
                colProb: "احتمال",
                colImpact: "تأثير",
                colCriticality: "حرجة",
                colReduction: "انخفاض",
                colStatus: "حالة",
                colResp: "مسؤول",

                axisProb: "الاحتمال ←",
                axisImpact: "↑ التأثير",

                probNotEval: "غير مقيم",
                probVeryUnlikely: "مستبعد جداً (< 5%)",
                probUnlikely: "مستبعد (5-25%)",
                probPossible: "ممكن (25-50%)",
                probLikely: "محتمل (50-75%)",
                probAlmostCertain: "شبه مؤكد (> 75%)",

                impactNotEval: "غير مقيم",
                impactMinor: "طفيف (< 1M€)",
                impactModerate: "متوسط (1-5M€)",
                impactSignificant: "كبير (5-20M€)",
                impactMajor: "رئيسي (20-50M€)",
                impactCatastrophic: "كارثي (> 50M€)",

                statusNotTreated: "غير معالج",
                statusInProgress: "قيد المعالجة",
                statusTreated: "معالج",
                statusAccepted: "مقبول",

                critNotEval: "غير مقيم",
                critLow: "مقبول",
                critMedium: "للمراقبة",
                critHigh: "حرج",

                addGroup: "إضافة مجموعة",
                addRisk: "إضافة مخاطرة",
                deleteGroup: "حذف",
                clickToAdd: "انقر للإضافة",
                clickToAddRemediation: "انقر لإضافة المعالجات",
                zoomMatrix: "تكبير المصفوفة"
            }
        };

        let currentLanguage = appStorage.getItem('riskr-language') || 'fr';

        // Fusion des chaînes v2.1 (définies dans features.js, hoistées)
        Object.keys(PLANNR_EXTRA_I18N).forEach(lang => {
            if (translations[lang]) Object.assign(translations[lang], PLANNR_EXTRA_I18N[lang]);
        });

        function t(key) {
            return translations[currentLanguage][key] || translations.fr[key] || key;
        }

        // ========================================
        // Données des échelles
        // ========================================

        function getProbabilityScale() {
            return [
                {value: 0, label: t('probNotEval'), color: "#F0F0F0", emoji: "⚪"},
                {value: 1, label: t('probVeryUnlikely'), color: "#C5E0B3", emoji: "🟩"},
                {value: 2, label: t('probUnlikely'), color: "#FFE699", emoji: "🟨"},
                {value: 3, label: t('probPossible'), color: "#F4B183", emoji: "🟧"},
                {value: 4, label: t('probLikely'), color: "#FFC7CE", emoji: "🟥"},
                {value: 5, label: t('probAlmostCertain'), color: "#FFC7CE", emoji: "🟥"}
            ];
        }

        function getImpactScale() {
            return [
                {value: 0, label: t('impactNotEval'), color: "#F0F0F0", emoji: "⚪"},
                {value: 1, label: t('impactMinor'), color: "#C5E0B3", emoji: "🟩"},
                {value: 2, label: t('impactModerate'), color: "#FFE699", emoji: "🟨"},
                {value: 3, label: t('impactSignificant'), color: "#F4B183", emoji: "🟧"},
                {value: 4, label: t('impactMajor'), color: "#FFC7CE", emoji: "🟥"},
                {value: 5, label: t('impactCatastrophic'), color: "#FFC7CE", emoji: "🟥"}
            ];
        }

        function getStatusOptions() {
            return [
                { value: "statusNotTreated", label: t('statusNotTreated'), emoji: "⚪" },
                { value: "statusInProgress", label: t('statusInProgress'), emoji: "🔄" },
                { value: "statusTreated", label: t('statusTreated'), emoji: "✅" },
                { value: "statusAccepted", label: t('statusAccepted'), emoji: "🤝" }
            ];
        }

        // Helper pour générer les options avec carrés colorés
        function generateOptions(scale, selectedValue) {
            return scale.map(item =>
                `<option value="${item.value}" ${item.value === selectedValue ? 'selected' : ''} style="background-color: ${item.color};">${item.emoji} ${item.label}</option>`
            ).join('');
        }

        // Helper pour générer les options de statut
        function generateStatusOptions(selectedStatus) {
            const statusOptions = getStatusOptions();

            return statusOptions.map(item =>
                `<option value="${item.value}" ${item.value === selectedStatus ? 'selected' : ''}>${item.emoji} ${item.label}</option>`
            ).join('');
        }

        // ========================================
        // Fonctions de calcul de criticité
        // ========================================
        // (Supprimées car non utilisées dans Plannr)

        // ========================================
        // DONNÉES - Tâches et Phases
        // ========================================

        // Formate une date ISO (YYYY-MM-DD) en français (DD/MM/YYYY)
        function formatDateFR(dateStr) {
            if (!dateStr) return '—';
            var parts = dateStr.split('-');
            if (parts.length !== 3) return dateStr;
            return parts[2] + '/' + parts[1] + '/' + parts[0];
        }

        // Calcule la durée en jours entre deux dates
        function calculateDuration(startDate, endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            const diff = end - start;
            return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
        }

        // Met à jour les dates d'une phase (min/max de ses tâches)
        function updatePhaseDates(phase) {
            if (!phase.tasks || phase.tasks.length === 0) {
                phase.startDate = "";
                phase.endDate = "";
                phase.duration = 0;
                return;
            }

            const starts = phase.tasks.map(t => new Date(t.startDate)).filter(d => !isNaN(d));
            const ends = phase.tasks.map(t => new Date(t.endDate)).filter(d => !isNaN(d));

            if (starts.length > 0) {
                phase.startDate = new Date(Math.min(...starts)).toISOString().split('T')[0];
            }
            if (ends.length > 0) {
                phase.endDate = new Date(Math.max(...ends)).toISOString().split('T')[0];
            }
            phase.duration = calculateDuration(phase.startDate, phase.endDate);
        }

        // ========================================
        // RECHARGEMENT DES DONNÉES (contourne le cache navigateur)
        // ========================================
        function reloadPlannrData() {
            // Étape 1 : Recharger plannr-data.js sans cache et mettre à jour en mémoire
            var oldScript = document.querySelector('script[src^="plannr-data"]');
            if (oldScript) oldScript.remove();
            var s = document.createElement('script');
            s.src = 'plannr-data.js?t=' + Date.now();
            s.onload = function() {
                var extData = window.PLANNR_DATA;
                var extPhases = extData && (extData.phases || extData.riskGroups);
                if (!extPhases) {
                    alert('Données invalides dans plannr-data.js');
                    return;
                }
                // Mettre à jour les variables globales
                riskGroups.length = 0;
                risks.length = 0;
                extPhases.forEach(function(g) {
                    riskGroups.push(g);
                    if (g.tasks) g.tasks.forEach(function(t) { risks.push(t); });
                });
                // Mettre à jour titre et sous-titre
                if (extData.appState) {
                    if (extData.appState.title) {
                        var el = document.getElementById('main-title');
                        if (el) el.textContent = extData.appState.title;
                    }
                    if (extData.appState.subtitle) {
                        var el2 = document.getElementById('main-subtitle');
                        if (el2) el2.textContent = extData.appState.subtitle;
                    }
                }
                // Re-rendre toute l'interface
                if (typeof renderPlanning === 'function') renderPlanning();
                if (typeof updateGantt === 'function') updateGantt();
                if (typeof updateDashboard === 'function') updateDashboard();
                if (typeof showToast === 'function') showToast('Données rechargées');

                // Étape 2 : Recharger la page complète avec cache-buster
                // pour que le HTML embarqué se mette aussi à jour
                var url = window.location.pathname;
                window.location.href = url + '?reload=' + Date.now();
            };
            s.onerror = function() { alert('Impossible de charger plannr-data.js'); };
            document.head.appendChild(s);
        }

        // ========================================
        // CHARGEMENT DES DONNÉES
        // ========================================
        let tasks, phases;

        const _extPhases = window.PLANNR_DATA &&
            (window.PLANNR_DATA.phases || window.PLANNR_DATA.riskGroups);
        if (_extPhases) {
            const extData = window.PLANNR_DATA;
            phases = _extPhases;
            tasks = [];
            phases.forEach(group => {
                if (group.tasks && Array.isArray(group.tasks)) {
                    group.tasks.forEach(t => tasks.push(t));
                }
            });
            if (extData.appState) {
                document.addEventListener('DOMContentLoaded', () => {
                    if (extData.appState.title) {
                        const el = document.getElementById('main-title');
                        if (el) { el.textContent = extData.appState.title; appStorage.setItem('analysis-main-title', extData.appState.title); }
                    }
                    if (extData.appState.subtitle) {
                        const el = document.getElementById('main-subtitle');
                        if (el) { el.textContent = extData.appState.subtitle; appStorage.setItem('analysis-main-subtitle', extData.appState.subtitle); }
                    }
                    if (extData.appState.language && typeof setLanguage === 'function') {
                        setLanguage(extData.appState.language);
                    }
                });
            }
        } else {
            // Pas de PLANNR_DATA chargé : placeholder minimal.
            // La SOURCE DE VÉRITÉ des données est plannr-data.js (window.PLANNR_DATA).
            // Ne PAS enrichir ce fallback — c'est un témoin visuel, pas un dataset.
            tasks = [
                { id: "1.0", title: "Jalon de démarrage", startDate: "2026-04-01", endDate: "2026-04-01", duration: 1, statut: "À faire", assignedTo: "", isMilestone: true },
                { id: "1.1", title: "Tâche exemple 1", startDate: "2026-04-01", endDate: "2026-04-15", duration: 15, statut: "À faire", assignedTo: "Équipe" },
                { id: "1.2", title: "Tâche exemple 2", startDate: "2026-04-16", endDate: "2026-04-30", duration: 15, statut: "À faire", assignedTo: "Équipe" }
            ];
            phases = [
                { id: 1, name: "Phase 1 — Exemple", description: "Données de démonstration", tasks: tasks, color: "#5E81AC" }
            ];
        }

        phases.forEach(updatePhaseDates);
        const risks = tasks;
        const riskGroups = phases;

        // ========================================
        // PALETTES DE COULEURS POUR LE GANTT
        // ========================================

        const colorPalettes = [
            { name: "Nord", colors: ["#5E81AC", "#81A1C1", "#88C0D0", "#8FBCBB", "#D08770", "#EBCB8B", "#A3BE8C", "#B48EAD"] },
            { name: "Dracula", colors: ["#FF79C6", "#BD93F9", "#FF6E6E", "#50FA7B", "#8BE9FD", "#F1FA8C", "#FFB86C", "#6272A4"] },
            { name: "Monokai", colors: ["#F92672", "#FD971F", "#F4BF75", "#A6E22E", "#66D9EF", "#AE81FF", "#A1EFE4", "#CC6666"] },
            { name: "Solarized Dark", colors: ["#268BD2", "#2AA198", "#859900", "#B58900", "#CB4B16", "#DC322F", "#D33682", "#6C71C4"] },
            { name: "Solarized Light", colors: ["#268BD2", "#2AA198", "#859900", "#B58900", "#CB4B16", "#DC322F", "#D33682", "#6C71C4"] },
            { name: "Gruvbox Dark", colors: ["#CC241D", "#D65D0E", "#D79921", "#689D6A", "#458588", "#B16286", "#FE8019", "#8EC07C"] },
            { name: "Gruvbox Light", colors: ["#9D0006", "#AF3A03", "#B57614", "#79740E", "#427B58", "#D65D0E", "#D5C4A1", "#8EC07C"] },
            { name: "Tokyo Night", colors: ["#F7768E", "#FF9E64", "#E0AF68", "#9AA5CE", "#7DCFFF", "#B4F9F8", "#7AA2F7", "#BB9AF7"] },
            { name: "Catppuccin Mocha", colors: ["#ED8796", "#FAB387", "#F5C2E7", "#CBA6F7", "#89B4FA", "#74C7EC", "#94E2D5", "#A6E3A1"] },
            { name: "Catppuccin Latte", colors: ["#D20F39", "#FE640B", "#DC8A78", "#8839EF", "#1E66F5", "#04A5E5", "#179299", "#40A02B"] },
            { name: "One Dark", colors: ["#E06C75", "#D19A66", "#E5C07B", "#98C379", "#61AFEF", "#56B6C2", "#C678DD", "#BE5046"] },
            { name: "GitHub Dark", colors: ["#FF7B72", "#F0883E", "#FFA657", "#3FB950", "#39C5CF", "#A5D6FF", "#D2A8FF", "#F78166"] },
            { name: "Material Ocean", colors: ["#FF5252", "#FF4081", "#E040FB", "#7C4DFF", "#536DFE", "#448AFF", "#40C4FF", "#18FFFF"] },
            { name: "Cyberpunk", colors: ["#FF003C", "#FF8A00", "#FCEE21", "#00F0FF", "#00FF9F", "#FF00FF", "#7B00FF", "#FF0055"] },
            { name: "Synthwave", colors: ["#FF006E", "#1EFFBC", "#00FF9F", "#FF00F5", "#00F0FF", "#FFE600", "#FF0055", "#7B00FF"] },
            { name: "Rose Pine", colors: ["#EB6F92", "#F6C177", "#EBBCBA", "#31748F", "#9CCFD8", "#C4A7E7", "#F6B2E7", "#E2E2E2"] },
            { name: "Night Owl", colors: ["#7FADB3", "#F78C6C", "#7E57C2", "#F78C6C", "#ECC48D", "#A3B8CC", "#82B1FF", "#FF6AC1"] },
            { name: "VS Code Dark", colors: ["#F14C4C", "#CE9178", "#DCDCAA", "#569CD6", "#4EC9B0", "#C586C0", "#9CDCFE", "#4FC1FF"] },
            { name: "Base16 Twilight", colors: ["#F43E5C", "#FB6F9B", "#FBC866", "#A6E22E", "#81A1C1", "#62B6B8", "#AE81FF", "#D8B8D8"] },
            { name: "Oceanic Next", colors: ["#E06C75", "#D19A66", "#98C379", "#61AFEF", "#56B6C2", "#C678DD", "#ABB2BF", "#5C6370"] },
            { name: "PaperColor", colors: ["#00AFFE", "#E60054", "#0099FF", "#FFD500", "#E65100", "#7C4DFF", "#00E676", "#FF4081"] },
            { name: "Zenburn", colors: ["#DC8CC3", "#93E0E3", "#8CD0D3", "#DFAF8F", "#CC9393", "#7CB8BB", "#DCDCCC", "#6F6F6F"] },
            { name: "Embark", colors: ["#BD8F9F", "#DFAF8F", "#A3CFEF", "#7CB8BB", "#93E0E3", "#DC8CC3", "#6F6F6F", "#BCBCBC"] },
            { name: "Alabaster", colors: ["#CA4052", "#A65E2E", "#A08050", "#8C9440", "#4F8084", "#768CB8", "#A65EB1", "#6F6F6F"] },
            { name: "Iceberg", colors: ["#8B6F8E", "#7493A6", "#75A8B9", "#8FB2B5", "#95B9C9", "#7493A6", "#8B6F8E", "#A7B8C0"] },
            { name: "City Lights", colors: ["#E06C75", "#D19A66", "#E5C07B", "#98C379", "#61AFEF", "#56B6C2", "#C678DD", "#ABB2BF"] },
            { name: "Darcula", colors: ["#FF6B68", "#FAC29C", "#FFE58F", "#FFFFA7", "#C2FFA7", "#C2FFFF", "#E5C2FF", "#FFC2FF"] },
            { name: "Nord Light", colors: ["#5E81AC", "#81A1C1", "#88C0D0", "#8FBCBB", "#D08770", "#EBCB8B", "#BF616A", "#B48EAD"] },
            { name: "Palenight", colors: ["#F07178", "#F78C6C", "#EBCB8B", "#C3E88D", "#89DDFF", "#82AAFF", "#C792EA", "#FFCB6B"] },
            { name: "Shades of Purple", colors: ["#F14760", "#E06C75", "#E5C07B", "#98C379", "#61AFEF", "#56B6C2", "#C678DD", "#A9B1D6"] },
            { name: "Lucy", colors: ["#818596", "#E8E8E8", "#B8B8B8", "#585858", "#FFFFFF", "#D4BFFF", "#FF9E8E", "#D1D1D1"] },
            { name: "Mone", colors: ["#E06C75", "#D19A66", "#E5C07B", "#98C379", "#61AFEF", "#56B6C2", "#C678DD", "#ABB2BF"] },
            { name: "Vim", colors: ["#E06C75", "#D19A66", "#E5C07B", "#98C379", "#61AFEF", "#56B6C2", "#C678DD", "#7F848E"] },
            { name: "Apple Classic", colors: ["#007AFF", "#5856D6", "#FF9500", "#FFCC00", "#4CD964", "#5AC8FA", "#FF2D55", "#8E8E93"] },
            { name: "Pastel", colors: ["#FFB3BA", "#FFDFBA", "#FFFFBA", "#BAFFC9", "#BAE1FF", "#E6B3FF", "#FFB3E6", "#C9F4F6"] },
            { name: "Neon", colors: ["#FF00FF", "#00FFFF", "#FF006E", "#7B00FF", "#00F0FF", "#FFE600", "#00FF9F", "#FF0055"] },
            { name: "Forest", colors: ["#2D5016", "#68A357", "#8BC34A", "#AED581", "#C5E1A5", "#DCEDC8", "#F1F8E9", "#FFEBEE"] }
        ];

        // Palette actuelle (défaut: Nord)
        let currentPalette = colorPalettes[0].colors;

        // Initialiser le sélecteur de palettes
        function initColorPaletteSelector() {
            const container = document.getElementById('color-palette-selector');
            if (!container) return;

            // Éviter de recréer si déjà initialisé
            if (container.querySelector('.custom-dropdown')) {
                return;
            }


            // Créer une dropdown personnalisée avec styles inline
            const dropdown = document.createElement('div');
            dropdown.className = 'custom-dropdown';
            dropdown.style.position = 'relative';

            // Créer le bouton trigger
            const trigger = document.createElement('button');
            trigger.className = 'dropdown-trigger';
            trigger.onclick = togglePaletteDropdown;
            trigger.style.cssText = 'padding: 8px 12px; font-size: 14px; border-radius: 8px; border: 1px solid #d2d2d7; background: white; cursor: pointer; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1); display: flex; align-items: center; gap: 6px; font-weight: 500; color: #1d1d1f; min-width: 180px;';
            trigger.innerHTML = '<span class="trigger-label">🎨 Palette...</span><span style="margin-left: auto;">▼</span>';

            // Créer le menu avec styles inline
            const menu = document.createElement('div');
            menu.id = 'palette-dropdown-menu';
            menu.className = 'dropdown-menu';
            menu.style.cssText = 'display: none; position: absolute; top: 100%; left: 0; margin-top: 4px; background: white; border: 1px solid #d2d2d7; border-radius: 8px; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15); max-height: 400px; overflow-y: auto; z-index: 1000; min-width: 300px;';

            // Remplir le menu avec les palettes
            colorPalettes.forEach((palette, index) => {
                const item = document.createElement('div');
                item.className = 'palette-item';
                item.dataset.index = index;
                item.style.cssText = 'padding: 10px 12px; cursor: pointer; display: flex; align-items: center; gap: 10px; border-bottom: 1px solid #f0f0f0; transition: background 0.2s;';

                // Créer les points de couleur avec styles inline
                const colorsPreview = document.createElement('div');
                colorsPreview.className = 'palette-colors-preview';
                colorsPreview.style.cssText = 'display: flex; gap: 4px; flex-wrap: wrap; width: 140px; flex-shrink: 0;';

                palette.colors.slice(0, 8).forEach(color => {
                    const dot = document.createElement('div');
                    dot.className = 'color-dot';
                    dot.style.cssText = 'width: 14px; height: 14px; border-radius: 50%; background: ' + color + '; border: 1px solid rgba(0,0,0,0.1); flex-shrink: 0;';
                    colorsPreview.appendChild(dot);
                });

                const nameSpan = document.createElement('span');
                nameSpan.className = 'palette-name';
                nameSpan.style.cssText = 'font-size: 13px; font-weight: 500; color: #1d1d1f; flex: 1; white-space: nowrap;';
                nameSpan.textContent = palette.name;

                item.appendChild(colorsPreview);
                item.appendChild(nameSpan);

                item.addEventListener('click', () => {
                    setColorPalette(index);
                    togglePaletteDropdown();
                });

                item.addEventListener('mouseenter', () => {
                    item.style.background = '#f5f5f7';
                });
                item.addEventListener('mouseleave', () => {
                    item.style.background = 'white';
                });

                menu.appendChild(item);
            });


            // Assembler
            dropdown.appendChild(trigger);
            dropdown.appendChild(menu);
            container.appendChild(dropdown);


            // Fermer la dropdown si on clique ailleurs
            document.addEventListener('click', (e) => {
                if (!e.target.closest('.custom-dropdown')) {
                    const dropdownMenu = document.getElementById('palette-dropdown-menu');
                    if (dropdownMenu) {
                        dropdownMenu.style.display = 'none';
                    }
                }
            });

            // Charger la palette sauvegardée
            const savedPalette = appStorage.getItem('plannr-color-palette');
            if (savedPalette !== null) {
                currentPalette = colorPalettes[savedPalette].colors;
                applyPalette(currentPalette);
                updateDropdownLabel(colorPalettes[savedPalette].name, currentPalette);
            }
        }

        // Toggle la dropdown
        function togglePaletteDropdown() {
            const menu = document.getElementById('palette-dropdown-menu');
            if (menu) {
                menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
            }
        }

        // Mettre à jour le label de la dropdown avec la palette actuelle
        function updateDropdownLabel(name, colors) {
            const trigger = document.querySelector('.dropdown-trigger span:first-child');
            if (trigger) {
                trigger.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 6px;">
                        ${colors.slice(0, 6).map(color =>
                            `<div style="width: 10px; height: 10px; border-radius: 50%; background: ${color}; border: 1px solid rgba(0,0,0,0.1);"></div>`
                        ).join('')}
                    </div>
                `;
            }
        }

        // Appliquer une palette de couleurs
        function applyPalette(colors) {
            phases.forEach((phase, index) => {
                const colorIndex = index % colors.length;
                phase.color = colors[colorIndex];
            });
            if (typeof renderPlanning === 'function') renderPlanning();
            updateGantt();
            if (typeof updateDashboard === 'function') updateDashboard();
            saveState();
        }

        // Changer la palette de couleurs
        function setColorPalette(paletteIndex) {
            const palette = colorPalettes[paletteIndex];
            if (!palette) return;

            currentPalette = palette.colors;
            appStorage.setItem('plannr-color-palette', paletteIndex);
            applyPalette(currentPalette);
            updateDropdownLabel(palette.name, currentPalette);

            showToast(`🎨 Palette "${palette.name}" appliquée`);
        }

        let chartBefore, chartAfter;
        
        // Créer l'interface utilisateur
        // Sauvegarder le mapping des groupes dans localStorage
        function saveGroupMapping() {
            const mapping = riskGroups.map(group => ({
                id: group.id,
                riskIds: group.tasks.map(r => r.id)
            }));
            appStorage.setItem('risk-groups-mapping', JSON.stringify(mapping));
        }

        // ========================================
        // Supprimer un groupe
        // ========================================
        function deleteGroup(groupId) {
            // Demander confirmation
            const group = riskGroups.find(g => g.id === groupId);
            if (!group) return;

            const confirmDelete = confirm(`Êtes-vous sûr de vouloir supprimer le groupe "${group.name}" ?\n\nTous les risques de ce groupe seront également supprimés.`);
            if (!confirmDelete) return;

            // Sauvegarder l'état avant modification
            saveState();

            // Supprimer le groupe
            const groupIndex = riskGroups.findIndex(g => g.id === groupId);
            if (groupIndex === -1) return;

            // Supprimer les risques de ce groupe du tableau global
            group.tasks.forEach(risk => {
                const riskIndex = risks.findIndex(r => r.id === risk.id);
                if (riskIndex !== -1) {
                    risks.splice(riskIndex, 1);
                }
            });

            // Supprimer le groupe
            riskGroups.splice(groupIndex, 1);

            // Renuméroter tous les groupes restants
            riskGroups.forEach((g, index) => {
                const oldId = g.id;
                const newId = index + 1;

                g.id = newId;

                // Renuméroter les risques de ce groupe
                g.risks.forEach(risk => {
                    const oldRiskId = risk.id;
                    const riskNumber = risk.id.split('.')[1];
                    const newRiskId = `${newId}.${riskNumber}`;

                    // Mettre à jour dans le tableau global risks AVANT de changer risk.id
                    // (car risk pourrait être une référence au même objet)
                    const globalRisk = risks.find(r => r.id === oldRiskId);
                    if (globalRisk) {
                        globalRisk.id = newRiskId;
                    }

                    // Maintenant on peut changer risk.id
                    risk.id = newRiskId;
                });
            });

            // Sauvegarder le nouveau mapping AVANT de re-rendre
            saveGroupMapping();

            // Re-rendre l'interface
            renderPlanning();
            updateGantt();

            showToast('✅ Groupe supprimé');
        }

        // Basculer entre Jalon et Tâche
        function toggleMilestone(riskId, event) {
            if (event) event.stopPropagation();
            
            const risk = risks.find(r => r.id === riskId);
            if (!risk) return;

            saveState();
            
            risk.isMilestone = !risk.isMilestone;
            
            // Si on repasse en tâche, on s'assure qu'il y a une date de fin (par défaut +7j)
            if (!risk.isMilestone && risk.startDate && (!risk.endDate || risk.endDate === risk.startDate)) {
                const start = new Date(risk.startDate);
                const end = new Date(start.getTime() + (7 * 24 * 60 * 60 * 1000));
                risk.endDate = end.toISOString().split('T')[0];
                risk.duration = 7;
            } else if (risk.isMilestone) {
                // Si jalon, date fin = date début
                risk.endDate = risk.startDate;
                risk.duration = 0;
            }

            sanitizeData(); // Nettoyage immédiat pour éviter les incohérences
            applyDependencyCascade({}); // v2.1 : la bascule change endDate
            recomputeCriticalPath();
            renderPlanning();
            updateGantt();
            updateDashboard();
        }

        // ========================================
        // Supprimer un risque
        // ========================================
        function deleteRisk(riskId) {
            // Demander confirmation
            const risk = risks.find(r => r.id === riskId);
            if (!risk) return;

            const confirmDelete = confirm(`Êtes-vous sûr de vouloir supprimer le risque "${risk.title}" ?`);
            if (!confirmDelete) return;

            // Sauvegarder l'état avant modification
            saveState();

            // Trouver le groupe contenant ce risque
            const group = riskGroups.find(g => g.tasks.some(r => r.id === riskId));
            if (!group) return;

            // Supprimer le risque du groupe
            const riskIndexInGroup = group.tasks.findIndex(r => r.id === riskId);
            if (riskIndexInGroup !== -1) {
                group.tasks.splice(riskIndexInGroup, 1);
            }

            // Supprimer le risque du tableau global
            const globalRiskIndex = risks.findIndex(r => r.id === riskId);
            if (globalRiskIndex !== -1) {
                risks.splice(globalRiskIndex, 1);
            }

            // Purger les références de dépendances vers la tâche supprimée (v2.1)
            risks.forEach(r => {
                if (Array.isArray(r.dependsOn)) {
                    r.dependsOn = r.dependsOn.filter(id => id !== riskId);
                    if (r.dependsOn.length === 0) delete r.dependsOn;
                }
            });
            recomputeCriticalPath();

            // Sauvegarder le nouveau mapping AVANT de re-rendre
            saveGroupMapping();

            // Re-rendre l'interface
            renderPlanning();
            updateGantt();

            showToast('✅ Tâche supprimée');
        }

        // ========================================
        // Transformer une tâche en jalon (et inversement)
        // ========================================
        window.toggleMilestone = function(riskId, event) {
            // Empêcher la propagation du clic pour éviter le drag & drop de la ligne
            if (event) {
                event.stopPropagation();
            }

            const risk = risks.find(r => r.id === riskId);
            if (!risk) return;

            // Sauvegarder l'état avant modification
            saveState();

            if (risk.isMilestone) {
                // Transformer en tâche normale : restaurer la date de fin
                risk.isMilestone = false;
                risk.endDate = new Date(new Date(risk.startDate).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                risk.duration = 7;
                showToast('✅ Jalon transformé en tâche');
            } else {
                // Transformer en jalon : supprimer la date de fin
                risk.isMilestone = true;
                risk.endDate = null;
                risk.duration = 0;
                showToast('◆ Tâche transformée en jalon');
            }

            // Recalculer les dates de la phase
            const phase = phases.find(p => p.id === parseInt(riskId.split('.')[0]));
            if (phase) {
                updatePhaseDates(phase);
            }

            // Re-rendre l'interface
            renderPlanning();
            updateGantt();
            updateDashboard();
        }

        // ========================================
        // Ajouter un nouveau risque à une position spécifique
        // ========================================
        function addNewRiskAtPosition(groupId, position, isMilestone = false, customDate = null, chart = null) {
            console.log('=== addNewRiskAtPosition ===', { groupId, position, isMilestone, customDate });

            // Sauvegarder l'état avant modification
            saveState();

            // Trouver le groupe cible
            const group = riskGroups.find(g => g.id === groupId);
            if (!group) return;

            console.log('Groupe trouvé:', group.name, 'avec', group.tasks.length, 'tâches:', group.tasks.map(t => t.id));

            // Calculer les dates
            let startDate, endDate;

            if (customDate) {
                // Utiliser la date fournie (position de la souris dans le graphique)
                startDate = customDate;

                if (!isMilestone && chart) {
                    // Calculer une durée adaptative pour les tâches
                    // Durée = 5% de la largeur visible du graphique
                    const xAxis = chart.scales.x;
                    const minDate = xAxis.min;
                    const maxDate = xAxis.max;
                    const visibleRange = maxDate - minDate;
                    const adaptiveDuration = visibleRange * 0.05; // 5% de la plage visible

                    const endTime = new Date(startDate).getTime() + adaptiveDuration;
                    endDate = new Date(endTime).toISOString().split('T')[0];
                } else if (!isMilestone) {
                    // Pas de chart mais tâche : durée par défaut de 7 jours
                    const endTime = new Date(startDate).getTime() + 7 * 24 * 60 * 60 * 1000;
                    endDate = new Date(endTime).toISOString().split('T')[0];
                } else {
                    // Jalon : pas de date de fin
                    endDate = null;
                }
            } else {
                // Calculer les dates par défaut (logique existante)
                // Si on insère après une tâche existante (position > 0), on prend sa date de début
                // Sinon, on utilise la date du jour
                if (position > 0 && group.tasks[position - 1]) {
                    // Prendre la date de début de la tâche précédente (celle au-dessus dans le tableau)
                    startDate = group.tasks[position - 1].startDate;
                    const endTime = new Date(startDate).getTime() + 7 * 24 * 60 * 60 * 1000;
                    endDate = new Date(endTime).toISOString().split('T')[0];
                } else {
                    // Sinon utiliser la date du jour
                    const today = new Date();
                    startDate = today.toISOString().split('T')[0];
                    endDate = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                }

                // Pour les jalons, pas de date de fin
                if (isMilestone) {
                    endDate = null;
                }
            }

            // Créer un nouveau risque (tâche ou jalon)
            // IMPORTANT: Créer avec l'ID final correct basé sur la position d'insertion
            // pour éviter que le renumérotation change l'ID et cause un tri visuel incorrect
            const finalId = position + 1;
            const newRisk = {
                id: `${groupId}.${finalId}`,
                title: isMilestone ? "Nouveau jalon" : "Nouvelle tâche",
                startDate: startDate,
                endDate: isMilestone ? null : endDate,
                duration: isMilestone ? 0 : calculateDuration(startDate, endDate),
                statut: "À faire",
                assignedTo: "",
                isMilestone: isMilestone
            };

            // Trouver l'index du groupe dans riskGroups
            const groupIndex = riskGroups.findIndex(g => g.id === groupId);
            if (groupIndex === -1) return;

            // DEBUG AVANT: Afficher l'état AVANT l'insertion
            console.log('=== DEBUG AVANT INSERTION ===');
            console.log('Position demandée:', position);
            console.log('ID final du jalon:', `${groupId}.${finalId}`);
            console.log('groupIndex:', groupIndex);
            console.log('État AVANT splice:', riskGroups[groupIndex].tasks.map((t, i) => `${i}:${t.id}(${t.isMilestone ? '★' : '○'})`).join(', '));
            console.log('============================');

            // Insérer directement dans riskGroups pour garantir la synchronisation
            riskGroups[groupIndex].tasks.splice(position, 0, newRisk);

            // DEBUG APRÈS: Afficher l'état APRÈS l'insertion
            console.log('=== DEBUG APRÈS INSERTION ===');
            console.log('État APRÈS splice:', riskGroups[groupIndex].tasks.map((t, i) => `${i}:${t.id}(${t.isMilestone ? '★' : '○'})`).join(', '));
            console.log('=============================');

            // IMPORTANT: Renuméroter TOUTES les tâches du groupe après insertion
            // pour garantir des IDs uniques et éviter les collisions (ex: deux 2.2)
            riskGroups[groupIndex].tasks.forEach((task, index) => {
                task.id = `${groupId}.${index + 1}`;
            });

            // DEBUG FINAL: Afficher l'état APRÈS renumérotation
            console.log('=== DEBUG APRÈS RENUMÉROTATION ===');
            console.log('État FINAL:', riskGroups[groupIndex].tasks.map((t, i) => `${i}:${t.id}(${t.isMilestone ? '★' : '○'})`).join(', '));
            console.log('================================');

            // Synchroniser group.tasks aussi (pour le tableau HTML)
            group.tasks = riskGroups[groupIndex].tasks;

            // IMPORTANT: Mettre à jour chart.options.phasesData pour garantir la synchronisation
            // sinon les calculs de position dans showSeparatorButtons seront basés sur des données obsolètes
            if (ganttChart && ganttChart.options) {
                ganttChart.options.phasesData = riskGroups.map(g => ({
                    id: g.id,
                    name: g.name,
                    description: g.description,
                    tasks: [...g.tasks],
                    color: g.color
                }));
                console.log('=== chart.options.phasesData mis à jour ===');
            }

            // DEBUG: Afficher l'ordre des tâches dans la console
            console.log('=== DEBUG INSERTION ===');
            console.log('Position demandée:', position);
            console.log('newRisk.isMilestone:', newRisk.isMilestone);
            console.log('Ordre riskGroups:', riskGroups[groupIndex].tasks.map(t => ({id: t.id, isMilestone: t.isMilestone})));
            console.log('====================');

            // Mettre à jour les dates de la phase
            const phaseForUpdate = riskGroups[groupIndex];
            updatePhaseDates(phaseForUpdate);

            // Sauvegarder le nouveau mapping AVANT de re-rendre
            saveGroupMapping();

            // Re-rendre l'interface
            renderPlanning();
            updateGantt();

            // Après le rendu, trouver la ligne du nouveau risque et ajouter le highlight
            setTimeout(() => {
                const newRow = document.querySelector(`tr[data-risk-id="${newRisk.id}"]`);
                if (newRow) {
                    newRow.classList.add('newly-added');
                    // Retirer la classe après l'animation
                    setTimeout(() => {
                        newRow.classList.remove('newly-added');
                    }, 2000);
                }
            }, 100);

            // Afficher un toast
            showToast('✅ Nouvelle tâche ajoutée');
        }

        // ========================================
        // Ajouter un nouveau groupe à une position spécifique
        // ========================================
        function addNewGroupAtPosition(position) {
            // Sauvegarder l'état avant modification
            saveState();

            // Calculer les dates par défaut
            const today = new Date();
            const startDate = today.toISOString().split('T')[0];
            const endDate = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

            // Créer un risque par défaut pour le nouveau groupe
            const tempId = `temp-${Date.now()}.1`;
            const defaultRisk = {
                id: tempId,
                title: "Nouvelle tâche",
                startDate: startDate,
                endDate: endDate,
                duration: 7,
                statut: "À faire",
                assignedTo: ""
            };

            // Créer un nouveau groupe avec le risque par défaut
            const newGroup = {
                id: 999999, // ID temporaire très élevé pour éviter les collisions
                name: "Nouvelle phase",
                description: "Cliquer pour modifier la description",
                risks: [defaultRisk],
                color: "#0071e3",
                startDate: startDate,
                endDate: endDate,
                duration: 7
            };

            // Insérer le nouveau groupe à la position spécifiée
            riskGroups.splice(position, 0, newGroup);

            // Ajouter le nouveau risque au tableau global AVANT la renumération
            risks.push(defaultRisk);

            // Renuméroter tous les groupes dans l'ordre
            riskGroups.forEach((group, index) => {
                const oldId = group.id;
                const newId = index + 1;

                // Mettre à jour l'ID du groupe
                group.id = newId;

                // Renuméroter les risques de ce groupe
                group.tasks.forEach(risk => {
                    // Changer "oldId.X" en "newId.X"
                    const oldRiskId = risk.id;
                    const riskNumber = risk.id.split('.')[1];
                    const newRiskId = `${newId}.${riskNumber}`;

                    // Mettre à jour dans le tableau global risks AVANT de changer risk.id
                    // (car risk pourrait être une référence au même objet)
                    const globalRisk = risks.find(r => r.id === oldRiskId);
                    if (globalRisk) {
                        globalRisk.id = newRiskId;
                    }

                    // Maintenant on peut changer risk.id
                    risk.id = newRiskId;
                });
            });

            // Sauvegarder le nouveau mapping AVANT de re-rendre
            saveGroupMapping();

            // Re-rendre l'interface
            renderPlanning();
            updateGantt();

            // Afficher un toast
            showToast('✅ Nouveau groupe ajouté');
        }

        // Restaurer le mapping des groupes depuis localStorage (appelé UNE SEULE FOIS à l'initialisation)
        function restoreGroupMappingFromStorage() {
            const savedMapping = appStorage.getItem('risk-groups-mapping');
            if (savedMapping) {
                try {
                    const mapping = JSON.parse(savedMapping);
                    mapping.forEach(groupMap => {
                        const group = riskGroups.find(g => g.id == groupMap.id);
                        if (group) {
                            // Reconstruire le tableau des risques du groupe
                            group.tasks = groupMap.riskIds
                                .map(riskId => risks.find(r => r.id === riskId))
                                .filter(r => r !== undefined);
                        }
                    });
                } catch (e) {
                    console.error('❌ Erreur lors de la restauration du mapping des groupes:', e);
                }
            }
        }

        // Mettre à jour une ligne de risque quand les dropdowns changent
        function updateRiskRow(riskIndex) {
            // Récupérer les valeurs actuelles des dropdowns
            const probBeforeElem = document.getElementById(`gc-prob-before-${riskIndex}`);
            const impactBeforeElem = document.getElementById(`gc-impact-before-${riskIndex}`);
            const probAfterElem = document.getElementById(`gc-prob-after-${riskIndex}`);
            const impactAfterElem = document.getElementById(`gc-impact-after-${riskIndex}`);

            if (!probBeforeElem || !impactBeforeElem || !probAfterElem || !impactAfterElem) {
                console.warn(`Impossible de trouver les éléments pour le risque ${riskIndex}`);
                updateGantt();
                return;
            }

            const probBefore = parseInt(probBeforeElem.value);
            const impactBefore = parseInt(impactBeforeElem.value);
            const probAfter = parseInt(probAfterElem.value);
            const impactAfter = parseInt(impactAfterElem.value);

            // Mettre à jour les badges de criticité
            const critBeforeCell = document.getElementById(`crit-before-${riskIndex}`);
            const critAfterCell = document.getElementById(`crit-after-${riskIndex}`);
            const reductionCell = document.getElementById(`reduction-${riskIndex}`);

            if (critBeforeCell) {
                critBeforeCell.innerHTML = getCriticalityBadge(probBefore, impactBefore);
            }

            if (critAfterCell) {
                critAfterCell.innerHTML = getCriticalityBadge(probAfter, impactAfter);
            }

            if (reductionCell) {
                reductionCell.innerHTML = getRiskReductionBadge(probBefore, impactBefore, probAfter, impactAfter);
            }

            // Mettre à jour les matrices et le dashboard
            updateGantt();
        }

        function renderPlanning() {
            const container = document.getElementById('planning-container');
            if (!container) return; // Sécurité si le conteneur n'existe pas
            container.innerHTML = '';

            // Si aucun groupe, ajouter au moins un séparateur initial
            if (riskGroups.length === 0) {
                const initialSeparator = document.createElement('div');
                initialSeparator.className = 'group-separator';
                initialSeparator.dataset.insertPosition = '0';
                initialSeparator.innerHTML = `
                    <div class="group-separator-label">
                        <span class="group-separator-icon">+</span>
                        <span>${t('addGroup')}</span>
                    </div>
                `;
                initialSeparator.addEventListener('click', () => {
                    addNewGroupAtPosition(0);
                });
                container.appendChild(initialSeparator);

                // Initialiser quand même les fonctions
                initDragAndDrop();
                initRiskTitleEditing();
                initRemediationEditing();
                initStatusDropdowns();
                initResponsableEditing();
                return;
            }

            riskGroups.forEach((group, groupIndex) => {
                // Ajouter un séparateur AVANT chaque groupe
                const separator = document.createElement('div');
                separator.className = 'group-separator';
                separator.dataset.insertPosition = groupIndex; // Position où insérer le nouveau groupe
                separator.innerHTML = `
                    <div class="group-separator-label">
                        <span class="group-separator-icon">+</span>
                        <span>${t('addGroup')}</span>
                    </div>
                `;
                separator.addEventListener('click', () => {
                    const position = parseInt(separator.dataset.insertPosition);
                    addNewGroupAtPosition(position);
                });
                container.appendChild(separator);

                const groupDiv = document.createElement('div');
                groupDiv.className = 'risk-group collapsible-section';

                // En-tête du groupe (collapsable)
                const headerDiv = document.createElement('h2');
                headerDiv.className = 'collapsible-header risk-group-header-collapsible';
                headerDiv.onclick = (e) => {
                    // Ne pas fermer/ouvrir si on clique sur le bouton de suppression
                    if (e.target.closest('.delete-btn')) return;
                    toggleCollapse(`group-content-${group.id}`);
                };
                headerDiv.innerHTML = `
                    <span class="collapse-icon">▼</span>
                    <div class="risk-group-number" style="background:${group.color}">${group.id}</div>
                    <div style="flex: 1;">
                        <div class="risk-group-title editable-group-name" id="group-name-${group.id}" data-group-id="${group.id}">${group.name}</div>
                        <div class="risk-group-description editable-group-description" id="group-desc-${group.id}" data-group-id="${group.id}">${group.description}</div>
                    </div>
                `;

                // Ajouter le bouton de suppression
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'delete-btn';
                deleteBtn.innerHTML = `<span>🗑️</span><span>${t('deleteGroup')}</span>`;
                deleteBtn.onclick = (e) => {
                    e.stopPropagation();
                    deleteGroup(group.id);
                };
                headerDiv.appendChild(deleteBtn);

                groupDiv.appendChild(headerDiv);

                // Contenu collapsable du groupe - Tableau des risques
                const contentDiv = document.createElement('div');
                contentDiv.id = `group-content-${group.id}`;
                contentDiv.className = 'collapsible-content';

                // Créer un wrapper pour le scroll horizontal (styles en CSS)
                const tableWrapper = document.createElement('div');
                tableWrapper.className = 'table-scroll-wrapper';

                // Créer un tableau pour les tâches
                const table = document.createElement('table');
                table.className = 'risks-table';
                table.innerHTML = `
                    <colgroup>
                        <col style="width: 25%">
                        <col style="width: 11%">
                        <col style="width: 12%">
                        <col style="width: 7%">
                        <col style="width: 8%">
                        <col style="width: 12%">
                        <col style="width: 12%">
                        <col style="width: 9%">
                        <col style="width: 4%">
                    </colgroup>
                    <thead>
                        <tr>
                            <th>${t('colTask')}</th>
                            <th>${t('colStartDate')}</th>
                            <th>${t('colEndDate')}</th>
                            <th>${t('colDuration')}</th>
                            <th>${t('colProgress')}</th>
                            <th>${t('colStatus')}</th>
                            <th>${t('colResp')}</th>
                            <th>${t('colDependsOn')}</th>
                            <th style="width: 40px;"></th>
                        </tr>
                    </thead>
                    <tbody id="group-${group.id}-risks" data-group-id="${group.id}">
                    </tbody>
                `;

                const tbody = table.querySelector('tbody');

                // Si aucun risque, ajouter au moins un séparateur
                if (group.tasks.length === 0) {
                    const separatorTr = document.createElement('tr');
                    separatorTr.className = 'risk-separator-row';
                    separatorTr.innerHTML = `
                        <td colspan="9">
                            <div class="risk-separator">
                                <div class="risk-separator-label add-task-btn" data-group-id="${group.id}" data-risk-position="0" data-is-milestone="false">
                                    <span class="risk-separator-icon">+</span>
                                    <span>${t('addRisk')}</span>
                                </div>
                                <div class="risk-separator-label add-milestone-btn" data-group-id="${group.id}" data-risk-position="0" data-is-milestone="true">
                                    <span class="risk-separator-icon">◆</span>
                                    <span>${t('addMilestone')}</span>
                                </div>
                            </div>
                        </td>
                    `;
                    const addTaskBtn = separatorTr.querySelector('.add-task-btn');
                    addTaskBtn.addEventListener('click', () => {
                        addNewRiskAtPosition(group.id, 0, false);
                    });
                    const addMilestoneBtn = separatorTr.querySelector('.add-milestone-btn');
                    addMilestoneBtn.addEventListener('click', () => {
                        addNewRiskAtPosition(group.id, 0, true);
                    });
                    tbody.appendChild(separatorTr);
                } else {
                    // Risques du groupe avec séparateurs
                    group.tasks.forEach((risk, localIndex) => {
                        // Ajouter un séparateur AVANT chaque risque
                        const separatorTr = document.createElement('tr');
                        separatorTr.className = 'risk-separator-row';
                        separatorTr.innerHTML = `
                            <td colspan="9">
                                <div class="risk-separator">
                                    <div class="risk-separator-label add-task-btn" data-group-id="${group.id}" data-risk-position="${localIndex}" data-is-milestone="false">
                                        <span class="risk-separator-icon">+</span>
                                        <span>${t('addRisk')}</span>
                                    </div>
                                    <div class="risk-separator-label add-milestone-btn" data-group-id="${group.id}" data-risk-position="${localIndex}" data-is-milestone="true">
                                        <span class="risk-separator-icon">◆</span>
                                        <span>${t('addMilestone')}</span>
                                    </div>
                                </div>
                            </td>
                        `;
                        const addTaskBtn = separatorTr.querySelector('.add-task-btn');
                        addTaskBtn.addEventListener('click', () => {
                            addNewRiskAtPosition(group.id, localIndex, false);
                        });
                        const addMilestoneBtn = separatorTr.querySelector('.add-milestone-btn');
                        addMilestoneBtn.addEventListener('click', () => {
                            addNewRiskAtPosition(group.id, localIndex, true);
                        });
                        tbody.appendChild(separatorTr);

                        // Ajouter le risque (tâche)
                        const index = risks.findIndex(r => r.id === risk.id);
                        const tr = document.createElement('tr');
                        tr.draggable = true;
                        tr.dataset.riskId = risk.id;
                        tr.dataset.riskIndex = index;

                        // Ajouter classe pour alternance de couleurs
                        tr.className = localIndex % 2 === 0 ? 'risk-even' : 'risk-odd';

                        // Durée en JOURS OUVRÉS (week-ends + fériés FR exclus),
                        // recalculée systématiquement depuis les dates
                        risk.duration = risk.isMilestone ? 0 :
                            workingDaysBetween(risk.startDate, risk.endDate || risk.startDate);

                        tr.innerHTML = `
                            <td class="risk-title-cell">
                                <span class="editable-risk-title" data-risk-id="${risk.id}">${risk.id}. ${risk.title}</span>
                            </td>
                            <td class="date-cell" style="white-space: nowrap;">
                                ${!risk.isMilestone ? `<span class="milestone-x" data-risk-id="${risk.id}" onclick="toggleMilestone('${risk.id}', event)" title="Transformer en jalon" style="cursor:pointer; margin-right:4px;">×</span>` : `<span class="milestone-badge" onclick="toggleMilestone('${risk.id}', event)" title="Clic pour retransformer en tâche" style="cursor:pointer; margin-right:4px;">◆</span>`}<span class="date-display" onclick="this.nextElementSibling.showPicker()">${formatDateFR(risk.startDate)}</span><input type="date" class="editable-date" data-risk-id="${risk.id}" data-date-type="startDate" value="${risk.startDate || ''}" style="position:absolute;opacity:0;pointer-events:none;width:0;height:0;">
                            </td>
                            <td class="date-cell">
                                <span class="date-display" onclick="this.nextElementSibling.showPicker()">${formatDateFR(risk.endDate)}</span>${overdueBadgeHTML(risk)}<input type="date" class="editable-date" data-risk-id="${risk.id}" data-date-type="endDate" value="${risk.endDate || ''}" ${risk.isMilestone ? 'disabled' : ''} style="position:absolute;opacity:0;pointer-events:none;width:0;height:0;">
                            </td>
                            <td class="duration-cell" id="duration-${index}">
                                ${risk.duration || 0}
                            </td>
                            ${renderProgressCellHTML(risk)}
                            <td class="status-cell">
                                <select id="status-${index}" data-risk-id="${risk.id}" class="status-dropdown">
                                    ${generateStatusOptions(risk.statut)}
                                </select>
                            </td>
                            <td class="responsable-cell">
                                <span class="editable-responsable" data-risk-id="${risk.id}">${risk.assignedTo || risk.responsable || t('clickToAdd')}</span>
                            </td>
                            ${renderDependsCellHTML(risk)}
                            <td style="text-align: center; padding: 4px;">
                                <button class="delete-btn delete-risk-btn" onclick="deleteRisk('${risk.id}')" title="Supprimer cette tâche">🗑️</button>
                            </td>
                        `;

                        tbody.appendChild(tr);
                    });

                    // Ajouter un séparateur APRÈS le dernier risque
                    const finalSeparatorTr = document.createElement('tr');
                    finalSeparatorTr.className = 'risk-separator-row';
                    finalSeparatorTr.innerHTML = `
                        <td colspan="9">
                            <div class="risk-separator">
                                <div class="risk-separator-label add-task-btn" data-group-id="${group.id}" data-risk-position="${group.tasks.length}" data-is-milestone="false">
                                    <span class="risk-separator-icon">+</span>
                                    <span>${t('addRisk')}</span>
                                </div>
                                <div class="risk-separator-label add-milestone-btn" data-group-id="${group.id}" data-risk-position="${group.tasks.length}" data-is-milestone="true">
                                    <span class="risk-separator-icon">◆</span>
                                    <span>${t('addMilestone')}</span>
                                </div>
                            </div>
                        </td>
                    `;
                    const addTaskBtn = finalSeparatorTr.querySelector('.add-task-btn');
                    addTaskBtn.addEventListener('click', () => {
                        addNewRiskAtPosition(group.id, group.tasks.length, false);
                    });
                    const addMilestoneBtn = finalSeparatorTr.querySelector('.add-milestone-btn');
                    addMilestoneBtn.addEventListener('click', () => {
                        addNewRiskAtPosition(group.id, group.tasks.length, true);
                    });
                    tbody.appendChild(finalSeparatorTr);
                }

                // Ajouter le tableau dans le wrapper de scroll
                tableWrapper.appendChild(table);

                // Ajouter le wrapper dans le contenu
                contentDiv.appendChild(tableWrapper);

                // Ajouter le contenu collapsable au groupe
                groupDiv.appendChild(contentDiv);

                // Restaurer l'état du collapse depuis localStorage
                const isCollapsed = appStorage.getItem(`collapse-group-content-${group.id}`) === 'true';
                if (isCollapsed) {
                    headerDiv.classList.add('collapsed');
                    contentDiv.classList.add('collapsed');
                }

                container.appendChild(groupDiv);
            });

            // Ajouter un dernier séparateur APRÈS le dernier groupe
            const finalSeparator = document.createElement('div');
            finalSeparator.className = 'group-separator';
            finalSeparator.dataset.insertPosition = riskGroups.length; // Position à la fin
            finalSeparator.innerHTML = `
                <div class="group-separator-label">
                    <span class="group-separator-icon">+</span>
                    <span>${t('addGroup')}</span>
                </div>
            `;
            finalSeparator.addEventListener('click', () => {
                const position = parseInt(finalSeparator.dataset.insertPosition);
                addNewGroupAtPosition(position);
            });
            container.appendChild(finalSeparator);

            // Initialiser le drag & drop et l'édition inline après le rendu
            initDragAndDrop();
            initGroupNameEditing(); // Indispensable pour éditer les nouveaux groupes
            initGroupDescriptionEditing(); // Indispensable pour éditer les descriptions
            initRiskTitleEditing();
            initRemediationEditing();
            initStatusDropdowns();
            initResponsableEditing();
            initSectionTitleEditing();
            initDateEditing(); // Édition des dates avec calcul auto durée
            initProgressEditing(); // Édition du % d'avancement (v2.1)
            initDependsEditing(); // Édition des dépendances (v2.1)
        }

        // ========================================
        // Système de Drag & Drop pour les risques
        // ========================================

        let draggedRow = null;

        function initDragAndDrop() {
            // Seulement les lignes de risques sont draggables, pas les lignes de remédiations
            const rows = document.querySelectorAll('.risks-table tbody tr:not(.risk-separator-row):not(.remediation-row)');

            rows.forEach(row => {
                row.addEventListener('dragstart', handleDragStart);
                row.addEventListener('dragend', handleDragEnd);
                // Plus de drop sur les risques, uniquement sur les séparateurs
            });

            // Les séparateurs peuvent aussi recevoir les drops
            const separators = document.querySelectorAll('.risks-table tbody tr.risk-separator-row');
            separators.forEach(sep => {
                sep.addEventListener('dragover', handleSeparatorDragOver);
                sep.addEventListener('drop', handleSeparatorDrop);
                sep.addEventListener('dragleave', handleSeparatorDragLeave);
            });
        }

        function handleDragStart(e) {
            draggedRow = this;
            this.classList.add('dragging');

            // Ajouter aussi la classe 'dragging' à la ligne de remédiation associée
            const riskId = this.dataset.riskId;
            const remediationRow = document.getElementById(`remediation-row-${riskId}`);
            if (remediationRow) {
                remediationRow.classList.add('dragging');
            }

            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/html', this.innerHTML);
        }

        function handleDragEnd(e) {
            this.classList.remove('dragging');

            // Retirer aussi la classe 'dragging' de la ligne de remédiation associée
            const riskId = this.dataset.riskId;
            const remediationRow = document.getElementById(`remediation-row-${riskId}`);
            if (remediationRow) {
                remediationRow.classList.remove('dragging');
            }

            // Retirer tous les indicateurs de drop
            document.querySelectorAll('.risks-table tbody tr:not(.risk-separator-row)').forEach(row => {
                row.classList.remove('drag-over-top', 'drag-over-bottom');
            });

            // Retirer aussi l'indicateur des séparateurs
            document.querySelectorAll('.risks-table tbody tr.risk-separator-row').forEach(row => {
                row.classList.remove('separator-drag-over');
            });
        }

        function handleDragOver(e) {
            if (e.preventDefault) {
                e.preventDefault();
            }
            e.dataTransfer.dropEffect = 'move';

            // Ajouter l'indicateur visuel
            if (draggedRow !== this) {
                // Déterminer si on monte ou on descend
                const tbody = this.closest('tbody');
                const allRiskRows = Array.from(tbody.querySelectorAll('tr[data-risk-id]'));
                const draggedIndex = allRiskRows.indexOf(draggedRow);
                const targetIndex = allRiskRows.indexOf(this);

                // Retirer les anciennes classes
                this.classList.remove('drag-over-top', 'drag-over-bottom');

                if (draggedIndex < targetIndex) {
                    // On descend : marqueur en bas du target
                    this.classList.add('drag-over-bottom');
                } else {
                    // On monte : marqueur en haut du target
                    this.classList.add('drag-over-top');
                }
            }

            return false;
        }

        function handleDragLeave(e) {
            this.classList.remove('drag-over-top', 'drag-over-bottom');
        }

        function handleDrop(e) {
            if (e.stopPropagation) {
                e.stopPropagation();
            }

            this.classList.remove('drag-over-top', 'drag-over-bottom');

            if (draggedRow !== this) {
                const sourceGroupId = draggedRow.closest('tbody').dataset.groupId;
                const targetGroupId = this.closest('tbody').dataset.groupId;
                const draggedRiskId = draggedRow.dataset.riskId;
                const targetRiskId = this.dataset.riskId;

                // Récupérer la ligne de remédiation associée au risque déplacé
                const draggedRemediationRow = document.getElementById(`remediation-row-${draggedRiskId}`);

                // Déplacer physiquement les deux lignes dans le DOM
                const targetRow = this;
                const tbody = targetRow.closest('tbody');

                // Trouver la position d'insertion (avant ou après le target selon la direction)
                const allRiskRows = Array.from(tbody.querySelectorAll('tr[data-risk-id]'));
                const draggedIndex = allRiskRows.indexOf(draggedRow);
                const targetIndex = allRiskRows.indexOf(targetRow);

                if (draggedIndex < targetIndex) {
                    // Déplacement vers le bas : insérer APRÈS le target
                    if (targetRow.nextElementSibling) {
                        // Si le target a une ligne de remédiation après lui, insérer après cette ligne
                        const targetRemediationRow = document.getElementById(`remediation-row-${targetRiskId}`);
                        if (targetRemediationRow && targetRemediationRow.nextElementSibling) {
                            tbody.insertBefore(draggedRow, targetRemediationRow.nextElementSibling);
                            tbody.insertBefore(draggedRemediationRow, targetRemediationRow.nextElementSibling);
                        } else {
                            tbody.appendChild(draggedRow);
                            tbody.appendChild(draggedRemediationRow);
                        }
                    } else {
                        tbody.appendChild(draggedRow);
                        tbody.appendChild(draggedRemediationRow);
                    }
                } else {
                    // Déplacement vers le haut : insérer AVANT le target
                    tbody.insertBefore(draggedRow, targetRow);
                    tbody.insertBefore(draggedRemediationRow, targetRow);
                }

                // Mettre à jour la structure de données
                moveRiskBetweenGroups(draggedRiskId, sourceGroupId, targetGroupId, targetRiskId);

                // Re-render tout le tableau pour recréer les séparateurs et numérotation
                renderPlanning();
                updateDashboard();
                initGroupNameEditing();
                initGroupDescriptionEditing();
                initRiskTitleEditing();
                initRemediationEditing();
                initStatusDropdowns();
                initResponsableEditing();
                initSectionTitleEditing();

                // Rafraîchir les graphiques
                updateGantt();

            }

            return false;
        }

        // Gestion du drag sur les séparateurs (interstices entre les risques)
        function handleSeparatorDragOver(e) {
            if (e.preventDefault) {
                e.preventDefault();
            }
            e.dataTransfer.dropEffect = 'move';

            // Ajouter l'indicateur visuel sur le séparateur
            this.classList.add('separator-drag-over');

            return false;
        }

        function handleSeparatorDragLeave(e) {
            this.classList.remove('separator-drag-over');
        }

        function handleSeparatorDrop(e) {
            if (e.stopPropagation) {
                e.stopPropagation();
            }

            this.classList.remove('separator-drag-over');

            if (draggedRow) {
                const separator = this.querySelector('.risk-separator');
                const targetGroupId = separator.dataset.groupId;
                const targetPosition = parseInt(separator.dataset.riskPosition);
                const sourceGroupId = draggedRow.closest('tbody').dataset.groupId;
                const draggedRiskId = draggedRow.dataset.riskId;


                // Déplacer le risque à la position exacte du séparateur
                moveRiskToPosition(draggedRiskId, sourceGroupId, targetGroupId, targetPosition);

                // Re-render tout le tableau
                renderPlanning();
                updateDashboard(); // Mettre à jour le dashboard
                initGroupNameEditing();
                initGroupDescriptionEditing();
                initRiskTitleEditing();
                initRemediationEditing();
                initStatusDropdowns();
                initResponsableEditing();
                initSectionTitleEditing();
                initDateEditing(); // Initialiser l'édition des dates

                // Rafraîchir les graphiques
                updateGantt();

            }

            return false;
        }

        function moveRiskToPosition(riskId, sourceGroupId, targetGroupId, targetPosition) {

            // Trouver le risque dans le tableau global
            const risk = risks.find(r => r.id === riskId);
            if (!risk) {
                console.error(`❌ Risque ${riskId} non trouvé`);
                return;
            }

            // Trouver les groupes source et cible
            const sourceGroup = riskGroups.find(g => g.id == sourceGroupId);
            const targetGroup = riskGroups.find(g => g.id == targetGroupId);

            if (!sourceGroup || !targetGroup) {
                console.error(`❌ Groupe source ou cible non trouvé`);
                return;
            }


            // Si on déplace dans le même groupe, ajuster la position
            let adjustedPosition = targetPosition;
            if (sourceGroupId === targetGroupId) {
                // Trouver la position actuelle du risque AVANT de le retirer
                const originalIndex = sourceGroup.tasks.findIndex(r => r.id === riskId);
                if (originalIndex !== -1 && originalIndex < targetPosition) {
                    adjustedPosition = targetPosition - 1;
                }
            }

            // Retirer le risque du groupe source
            sourceGroup.tasks = sourceGroup.tasks.filter(r => r.id !== riskId);

            // Insérer le risque à la position exacte dans le groupe cible
            targetGroup.tasks.splice(adjustedPosition, 0, risk);

            // Sauvegarder le mapping
            saveGroupMapping();
        }

        function moveRiskBetweenGroups(riskId, sourceGroupId, targetGroupId, targetRiskId = null) {
            // Trouver le risque dans le tableau global
            const risk = risks.find(r => r.id === riskId);
            if (!risk) return;

            // Trouver les groupes source et cible
            const sourceGroup = riskGroups.find(g => g.id == sourceGroupId);
            const targetGroup = riskGroups.find(g => g.id == targetGroupId);

            if (!sourceGroup || !targetGroup) return;

            // Retirer le risque du groupe source
            sourceGroup.tasks = sourceGroup.tasks.filter(r => r.id !== riskId);

            // Ajouter le risque au groupe cible à la bonne position
            if (!targetGroup.tasks.find(r => r.id === riskId)) {
                if (targetRiskId) {
                    // Insérer à la position du target
                    const targetIndex = targetGroup.tasks.findIndex(r => r.id === targetRiskId);
                    if (targetIndex !== -1) {
                        // Insérer après le target si on descend, avant si on monte
                        const currentTargetIndex = targetGroup.tasks.findIndex(r => r.id === targetRiskId);
                        targetGroup.tasks.splice(currentTargetIndex + 1, 0, risk);
                    } else {
                        targetGroup.tasks.push(risk);
                    }
                } else {
                    // Si pas de target spécifique, ajouter à la fin
                    targetGroup.tasks.push(risk);
                }
            }

            // Sauvegarder le mapping
            saveGroupMapping();
        }

        // Lire les valeurs des formulaires
        function getCurrentRisks() {
            return risks.map((risk, index) => {
                // Vérifier que les éléments existent dans le DOM
                const probBeforeElem = document.getElementById(`gc-prob-before-${index}`);
                const impactBeforeElem = document.getElementById(`gc-impact-before-${index}`);
                const probAfterElem = document.getElementById(`gc-prob-after-${index}`);
                const impactAfterElem = document.getElementById(`gc-impact-after-${index}`);

                // Si les éléments n'existent pas encore, utiliser les valeurs du risque
                const gcProbBefore = probBeforeElem ? parseInt(probBeforeElem.value) : risk.gcBefore[0];
                const gcImpactBefore = impactBeforeElem ? parseInt(impactBeforeElem.value) : risk.gcBefore[1];
                const gcProbAfter = probAfterElem ? parseInt(probAfterElem.value) : risk.gcAfter[0];
                const gcImpactAfter = impactAfterElem ? parseInt(impactAfterElem.value) : risk.gcAfter[1];

                return {
                    ...risk,
                    dtuBefore: [gcProbBefore, gcImpactBefore],  // Utiliser G&C pour DTU
                    dtuAfter: [gcProbAfter, gcImpactAfter],      // Utiliser G&C pour DTU
                    gcBefore: [gcProbBefore, gcImpactBefore],
                    gcAfter: [gcProbAfter, gcImpactAfter]
                };
            });
        }
        
        // Plugin pour dessiner la matrice de couleurs en arrière-plan
        const matrixBackgroundPlugin = {
            id: 'matrixBackground',
            beforeDatasetsDraw: (chart) => {
                const { ctx, chartArea: { left, top, width, height }, scales: { x, y } } = chart;

                // Matrice 5×5 complète avec carrés égaux
                // Criticité = P×I : 1-4 vert, 5-9 jaune, 10-14 orange, 15-25 rouge
                const zones = [
                    // Impact 5 (ligne du haut)
                    { xMin: 0.5, xMax: 1.5, yMin: 4.5, yMax: 5.5, color: '#E8F5E9' },  // P=1, I=5, Crit=5 (vert pâle)
                    { xMin: 1.5, xMax: 2.5, yMin: 4.5, yMax: 5.5, color: '#FFE699' },  // P=2, I=5, Crit=10 (orange)
                    { xMin: 2.5, xMax: 3.5, yMin: 4.5, yMax: 5.5, color: '#F4B183' },  // P=3, I=5, Crit=15 (rouge)
                    { xMin: 3.5, xMax: 4.5, yMin: 4.5, yMax: 5.5, color: '#FFC7CE' },  // P=4, I=5, Crit=20 (rouge)
                    { xMin: 4.5, xMax: 5.5, yMin: 4.5, yMax: 5.5, color: '#FFC7CE' },  // P=5, I=5, Crit=25 (rouge)

                    // Impact 4
                    { xMin: 0.5, xMax: 1.5, yMin: 3.5, yMax: 4.5, color: '#C5E0B3' },  // P=1, I=4, Crit=4 (vert)
                    { xMin: 1.5, xMax: 2.5, yMin: 3.5, yMax: 4.5, color: '#FFE699' },  // P=2, I=4, Crit=8 (jaune)
                    { xMin: 2.5, xMax: 3.5, yMin: 3.5, yMax: 4.5, color: '#F4B183' },  // P=3, I=4, Crit=12 (orange)
                    { xMin: 3.5, xMax: 4.5, yMin: 3.5, yMax: 4.5, color: '#FFC7CE' },  // P=4, I=4, Crit=16 (rouge)
                    { xMin: 4.5, xMax: 5.5, yMin: 3.5, yMax: 4.5, color: '#FFC7CE' },  // P=5, I=4, Crit=20 (rouge)

                    // Impact 3
                    { xMin: 0.5, xMax: 1.5, yMin: 2.5, yMax: 3.5, color: '#C5E0B3' },  // P=1, I=3, Crit=3 (vert)
                    { xMin: 1.5, xMax: 2.5, yMin: 2.5, yMax: 3.5, color: '#E8F5E9' },  // P=2, I=3, Crit=6 (vert pâle)
                    { xMin: 2.5, xMax: 3.5, yMin: 2.5, yMax: 3.5, color: '#FFE699' },  // P=3, I=3, Crit=9 (jaune)
                    { xMin: 3.5, xMax: 4.5, yMin: 2.5, yMax: 3.5, color: '#F4B183' },  // P=4, I=3, Crit=12 (orange)
                    { xMin: 4.5, xMax: 5.5, yMin: 2.5, yMax: 3.5, color: '#FFC7CE' },  // P=5, I=3, Crit=15 (rouge)

                    // Impact 2
                    { xMin: 0.5, xMax: 1.5, yMin: 1.5, yMax: 2.5, color: '#C5E0B3' },  // P=1, I=2, Crit=2 (vert)
                    { xMin: 1.5, xMax: 2.5, yMin: 1.5, yMax: 2.5, color: '#C5E0B3' },  // P=2, I=2, Crit=4 (vert)
                    { xMin: 2.5, xMax: 3.5, yMin: 1.5, yMax: 2.5, color: '#E8F5E9' },  // P=3, I=2, Crit=6 (vert pâle)
                    { xMin: 3.5, xMax: 4.5, yMin: 1.5, yMax: 2.5, color: '#FFE699' },  // P=4, I=2, Crit=8 (jaune)
                    { xMin: 4.5, xMax: 5.5, yMin: 1.5, yMax: 2.5, color: '#F4B183' },  // P=5, I=2, Crit=10 (orange)

                    // Impact 1
                    { xMin: 0.5, xMax: 1.5, yMin: 0.5, yMax: 1.5, color: '#C5E0B3' },  // P=1, I=1, Crit=1 (vert)
                    { xMin: 1.5, xMax: 2.5, yMin: 0.5, yMax: 1.5, color: '#C5E0B3' },  // P=2, I=1, Crit=2 (vert)
                    { xMin: 2.5, xMax: 3.5, yMin: 0.5, yMax: 1.5, color: '#C5E0B3' },  // P=3, I=1, Crit=3 (vert)
                    { xMin: 3.5, xMax: 4.5, yMin: 0.5, yMax: 1.5, color: '#C5E0B3' },  // P=4, I=1, Crit=4 (vert)
                    { xMin: 4.5, xMax: 5.5, yMin: 0.5, yMax: 1.5, color: '#E8F5E9' }   // P=5, I=1, Crit=5 (vert pâle)
                ];

                ctx.save();

                zones.forEach(zone => {
                    const xStart = x.getPixelForValue(zone.xMin);
                    const xEnd = x.getPixelForValue(zone.xMax);
                    const yStart = y.getPixelForValue(zone.yMax);
                    const yEnd = y.getPixelForValue(zone.yMin);

                    // Remplir le carré avec la couleur
                    ctx.fillStyle = zone.color;
                    ctx.fillRect(xStart, yStart, xEnd - xStart, yEnd - yStart);

                    // Dessiner la bordure blanche
                    ctx.strokeStyle = 'white';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(xStart, yStart, xEnd - xStart, yEnd - yStart);
                });

                ctx.restore();
            }
        };
        
        // Les fonctions de rendu des graphiques de risques ont été supprimées.
        
        // Ajouter un tableau pour les moyennes des groupes
        function updateGroupTable(groupBeforeData, groupAfterData) {
            // Récupérer le container dans la colonne droite
            const groupTableWrapper = document.getElementById('group-table-wrapper');
            if (!groupTableWrapper) {
                console.error('group-table-wrapper not found');
                return;
            }

            // Créer ou mettre à jour le tableau des groupes avec structure collapsable
            groupTableWrapper.innerHTML = `
                <div class="risk-table-container group-summary-table collapsible-section" style="margin-bottom: 8px;">
                    <h3 class="collapsible-header" onclick="toggleCollapse('group-summary-table-content')" style="margin-bottom: 8px;">
                        <span class="collapse-icon">▼</span>
                        Moyennes par Groupe
                    </h3>
                    <div id="group-summary-table-content" class="collapsible-content">
                        <div class="table-scroll-wrapper">
                            <table class="risk-table" style="table-layout: fixed;">
                                <thead>
                                    <tr>
                                        <th style="width: 90px;">Groupe</th>
                                        <th>Catégorie</th>
                                        <th style="width: 100px;">Avant</th>
                                        <th style="width: 100px;">Après</th>
                                    </tr>
                                </thead>
                                <tbody id="group-table-body">
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `;
            
            const groupTableBody = document.getElementById('group-table-body');
            
            riskGroups.forEach((group, index) => {
                // Trouver les données correspondantes au groupe dans les tableaux (qui peuvent être filtrés)
                const beforeData = groupBeforeData.find(d => d.groupIndex === index);
                const afterData = groupAfterData.find(d => d.groupIndex === index);
                
                if (!beforeData || !afterData) {
                    // Si pas de données (ex: tous les risques à 0), afficher N/A ou vide
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td style="text-align: center; font-weight: 600; color: #1d1d1f; width: 90px;">${group.id}</td>
                        <td>
                            <div style="font-weight: 600; color: #1d1d1f; margin-bottom: 4px; line-height: 1.3;">${group.name}</div>
                            <div style="font-weight: 400; color: #5a5a5f; line-height: 1.4;">${group.description}</div>
                        </td>
                        <td colspan="2" style="text-align: center; color: #999; font-style: italic;">Aucun risque évalué</td>
                    `;
                    groupTableBody.appendChild(row);
                    return;
                }
                
                // Utiliser les valeurs de base
                const realXBefore = beforeData.baseX;
                const realYBefore = beforeData.baseY;
                const realXAfter = afterData.baseX;
                const realYAfter = afterData.baseY;
                
                // Calculer la criticité brute (P×I peut aller jusqu'à 25)
                const critBeforeRaw = realXBefore * realYBefore;
                const critAfterRaw = realXAfter * realYAfter;

                // Normaliser sur 5 : (criticité / 25) × 5
                const critBefore = (critBeforeRaw / 25) * 5;
                const critAfter = (critAfterRaw / 25) * 5;
                
                function getCritClass(crit) {
                    if (crit === 0) return 'criticality-low';
                    if (crit <= 0.8) return 'criticality-low';       // 1-4 sur 25 = 0.2-0.8 sur 5
                    if (crit <= 1.8) return 'criticality-medium';    // 5-9 sur 25 = 1.0-1.8 sur 5
                    if (crit <= 2.8) return 'criticality-high';      // 10-14 sur 25 = 2.0-2.8 sur 5
                    return 'criticality-critical';                    // 15-25 sur 25 = 3.0-5 sur 5
                }
                
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td style="text-align: center; font-weight: 600; color: #1d1d1f; width: 90px;">${group.id}</td>
                    <td>
                        <div style="font-weight: 600; color: #1d1d1f; margin-bottom: 4px; line-height: 1.3;">${group.name}</div>
                        <div style="font-weight: 400; color: #5a5a5f; line-height: 1.4;">${group.description}</div>
                    </td>
                    <td style="text-align: center; width: 100px;">
                        <span class="criticality-badge ${getCritClass(critBefore)}" style="display: block;">
                            ${critBefore.toFixed(1)}/5
                        </span>
                    </td>
                    <td style="text-align: center; width: 100px;">
                        <span class="criticality-badge ${getCritClass(critAfter)}" style="display: block;">
                            ${critAfter.toFixed(1)}/5
                        </span>
                    </td>
                `;

                groupTableBody.appendChild(row);
            });

            // Restaurer l'état du collapse après génération du tableau
            const groupSummaryContent = document.getElementById('group-summary-table-content');
            const isCollapsed = appStorage.getItem('collapse-group-summary-table-content') === 'true';

            if (isCollapsed && groupSummaryContent) {
                const header = groupSummaryContent.previousElementSibling;
                header.classList.add('collapsed');
                groupSummaryContent.classList.add('collapsed');
            }
        }
        
        // ========================================
        // Algorithme de répartition des points (Anti-collision)
        // ========================================
        function resolveCollisions(points) {
            // Paramètres de la simulation
            const iterations = 50;       // Nombre de passes pour stabiliser
            const radius = 0.4;          // Rayon augmenté pour éviter le chevauchement des labels 16px
            const strength = 0.2;        // Force de répulsion plus ferme
            const attraction = 0.05;     // Force de rappel vers la position d'origine
            const maxDisplacement = 0.48;// Déplacement max autorisé (reste dans la case +/- 0.5)

            // Initialiser les positions actuelles si pas encore fait
            points.forEach(p => {
                if (typeof p.x === 'undefined') p.x = p.baseX;
                if (typeof p.y === 'undefined') p.y = p.baseY;
            });

            for (let i = 0; i < iterations; i++) {
                points.forEach(p1 => {
                    // 1. Force de rappel vers l'origine (baseX, baseY)
                    const distToOriginX = p1.baseX - p1.x;
                    const distToOriginY = p1.baseY - p1.y;
                    
                    p1.x += distToOriginX * attraction;
                    p1.y += distToOriginY * attraction;

                    // 2. Forces de répulsion entre points
                    points.forEach(p2 => {
                        if (p1 === p2) return;

                        const dx = p1.x - p2.x;
                        const dy = p1.y - p2.y;
                        const distSq = dx * dx + dy * dy;
                        const dist = Math.sqrt(distSq);

                        // Si les points sont trop proches (collision)
                        if (dist < radius) {
                            // Calculer la force de répulsion
                            // Plus ils sont proches, plus la force est grande
                            const force = (radius - dist) / radius; // 1.0 si superposés, 0.0 si à la limite
                            
                            // Vecteur de répulsion normalisé
                            let rx = dx / dist;
                            let ry = dy / dist;

                            // Cas particulier : superposition parfaite
                            if (dist === 0) {
                                // Répulsion aléatoire déterministe basée sur l'index ou l'ID
                                const angle = (Math.random() * Math.PI * 2); 
                                rx = Math.cos(angle);
                                ry = Math.sin(angle);
                            }

                            // Appliquer la force
                            const moveX = rx * force * strength;
                            const moveY = ry * force * strength;

                            p1.x += moveX;
                            p1.y += moveY;
                            p2.x -= moveX; // Action-réaction
                            p2.y -= moveY;
                        }
                    });

                    // 3. Contraintes (limites de la case)
                    // On s'assure que le point ne s'éloigne pas trop de sa valeur réelle
                    // pour ne pas induire en erreur sur la "case" visuelle
                    const currentDistX = p1.x - p1.baseX;
                    const currentDistY = p1.y - p1.baseY;
                    
                    // Clamper le déplacement
                    if (Math.abs(currentDistX) > maxDisplacement) {
                        p1.x = p1.baseX + Math.sign(currentDistX) * maxDisplacement;
                    }
                    if (Math.abs(currentDistY) > maxDisplacement) {
                        p1.y = p1.baseY + Math.sign(currentDistY) * maxDisplacement;
                    }
                });
            }
            
            return points;
        }

        // Mettre à jour les graphiques
        // ========================================
        // Mise à jour du diagramme de Gantt
        // ========================================

        let ganttChart = null;
        let ganttViewMode = 'cascade'; // 'compact', 'cascade' ou 'groupe'

        // Changer le mode de vue du Gantt
        function setGanttView(mode) {
            ganttViewMode = mode;
            
            // Sauvegarder la préférence
            appStorage.setItem('plannr-gantt-view', mode);

            // Mettre à jour les boutons
            const btnCompact = document.getElementById('view-btn-compact');
            const btnCascade = document.getElementById('view-btn-cascade');
            const btnConsolide = document.getElementById('view-btn-consolide');

            // Reset tous les boutons
            [btnCompact, btnCascade, btnConsolide].forEach(btn => {
                if (btn) {
                    btn.style.background = 'transparent';
                    btn.style.color = '#666';
                    btn.style.boxShadow = 'none';
                    btn.classList.remove('active');
                }
            });

            // Activer le bouton sélectionné
            let activeBtn = null;
            if (mode === 'compact') activeBtn = btnCompact;
            else if (mode === 'cascade') activeBtn = btnCascade;
            else if (mode === 'consolide') activeBtn = btnConsolide;

            if (activeBtn) {
                activeBtn.style.background = 'white';
                activeBtn.style.color = '#1d1d1f';
                activeBtn.style.boxShadow = '0 1px 2px rgba(0,0,0,0.1)';
                activeBtn.classList.add('active');
            }

            // Mettre à jour le Gantt
            updateGantt();
        }

        // Initialiser la vue au chargement
        function initGanttView() {
            const savedView = appStorage.getItem('plannr-gantt-view');
            if (savedView && ['compact', 'cascade', 'consolide'].includes(savedView)) {
                setGanttView(savedView);
            } else {
                setGanttView('cascade'); // Défaut
            }
        }



        // Compactage : Tâches d'abord, puis insertion des jalons dans les espaces vides
        function compactTasksAndMilestones(allTasks) {
            // Séparer jalons et tâches
            const tasks = allTasks.filter(t => !t.isMilestone);
            const milestones = allTasks.filter(t => t.isMilestone);

            // 1. Compacter les tâches pour créer la structure principale
            const lines = compactTasks(tasks);

            // 2. Insérer les jalons sur les lignes existantes sans créer de conflit VISUEL entre jalons
            // (Les jalons sont affichés sous les tâches, donc pas de conflit tâche/jalon)
            milestones.forEach(milestone => {
                const milestoneStart = new Date(milestone.startDate).getTime();
                let bestLineIndex = -1;
                
                // Chercher une ligne où le jalon ne chevauche pas un autre jalon
                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i];
                    let canPlace = true;
                    
                    for (const existingItem of line) {
                        if (existingItem.isMilestone) {
                             const existingStart = new Date(existingItem.startDate).getTime();
                             // Marge de sécurité de 2 jours pour éviter la superposition des capsules
                             if (Math.abs(existingStart - milestoneStart) < 2 * 86400000) {
                                 canPlace = false;
                                 break;
                             }
                        }
                    }
                    
                    if (canPlace) {
                        bestLineIndex = i;
                        break;
                    }
                }
                
                if (bestLineIndex !== -1) {
                    lines[bestLineIndex].push(milestone);
                } else {
                    // Si conflit partout avec d'autres jalons, on met sur la dernière ligne existante
                    // (On accepte la superposition plutôt que de créer une nouvelle ligne)
                    if (lines.length > 0) {
                        lines[lines.length - 1].push(milestone);
                    } else {
                        // Cas extrême : aucun tâche, juste des jalons -> on est obligé de créer une ligne
                        lines.push([milestone]);
                    }
                }
            });

            // Transformer pour updateGantt
            // On trie les lignes par date de début de la première tâche pour garder une logique chronologique
            const sortedLines = lines.sort((lineA, lineB) => {
                const getStart = (line) => {
                    const tasksOnly = line.filter(t => !t.isMilestone);
                    if (tasksOnly.length === 0) return 0; // Ligne de jalons purs (rare)
                    return Math.min(...tasksOnly.map(t => new Date(t.startDate).getTime()));
                };
                return getStart(lineA) - getStart(lineB);
            });

            return sortedLines.map(line => ({
                type: 'mixed',
                line: line
            }));
        }

        // Algorithme de compactage : minimiser le nombre de lignes en gérant les chevauchements
        function compactTasks(allTasks) {
            // Trier les tâches par date de début
            const sortedTasks = [...allTasks].sort((a, b) =>
                new Date(a.startDate) - new Date(b.startDate)
            );

            const lines = []; // Array de tâches par ligne

            for (const task of sortedTasks) {
                const taskStart = new Date(task.startDate).getTime();
                // Pour les jalons, utiliser la date de début comme "fin" (largeur minimale)
                const taskEnd = (task.isMilestone || !task.endDate)
                    ? taskStart + 3600000 // 1 heure pour les jalons
                    : new Date(task.endDate).getTime();

                // Chercher la première ligne disponible
                let placed = false;
                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i];
                    // Vérifier si la tâche chevauche une tâche de cette ligne
                    let canPlace = true;
                    for (const existingTask of line) {
                        const existingStart = new Date(existingTask.startDate).getTime();
                        const existingEnd = (existingTask.isMilestone || !existingTask.endDate)
                            ? existingStart + 3600000
                            : new Date(existingTask.endDate).getTime();
                        // Chevauchement si les intervalles se recoupent (avec marge de 1 jour)
                        // On ajoute 1 jour (86400000ms) de buffer pour éviter que les barres ne se touchent
                        const buffer = 86400000;
                        if (!((taskEnd + buffer) <= existingStart || taskStart >= (existingEnd + buffer))) {
                            canPlace = false;
                            break;
                        }
                    }
                    if (canPlace) {
                        line.push(task);
                        placed = true;
                        break;
                    }
                }

                // Si aucune ligne disponible, en créer une nouvelle
                if (!placed) {
                    lines.push([task]);
                }
            }

            return lines;
        }

        // Enregistrer le plugin de jalon AVANT la fonction updateGantt
        Chart.register({
            id: 'ganttLinesPlugin',
            beforeDatasetsDraw: function(chart) {
                const ctx = chart.ctx;
                const xAxis = chart.scales.x;
                const yAxis = chart.scales.y;
                const ganttData = chart.options.ganttData;

                if (!ganttData || ganttViewMode === 'phase') return;

                // En mode cascade, dessiner des lignes uniformes entre les lanes de tâches
                if (ganttViewMode === 'cascade') {
                    ctx.save();
                    ctx.strokeStyle = '#e0e0e0';
                    ctx.lineWidth = 1;

                    // En mode cascade, ganttData ne contient que des tâches (pas de jalons)
                    // Dessiner une ligne après chaque lane de tâche (sauf la dernière)
                    for (let i = 0; i < ganttData.length - 1; i++) {
                        const currentTask = ganttData[i];
                        const nextTask = ganttData[i + 1];

                        // Calculer la position Y de la ligne de séparation (au milieu des deux tâches)
                        const currentY = yAxis.getPixelForValue(currentTask.y);
                        const nextY = yAxis.getPixelForValue(nextTask.y);
                        const lineY = (currentY + nextY) / 2;

                        ctx.beginPath();
                        ctx.moveTo(xAxis.left, lineY);
                        ctx.lineTo(xAxis.right, lineY);
                        ctx.stroke();
                    }

                    ctx.restore();
                }

                // En mode consolidé, dessiner séparateurs de phase + labels à gauche
                if (ganttViewMode === 'consolide') {
                    const layout = chart.options.consolidatedPhaseLayout;
                    if (!layout) return;

                    ctx.save();

                    layout.forEach((entry, entryIndex) => {
                        const phase = entry.phase;
                        const startLine = entry.startLine;
                        const numPhaseLines = entry.numLines;

                        if (numPhaseLines === 0) return;

                        // Pixels Y du début et de la fin du bloc de phase
                        const yTop = yAxis.getPixelForValue(startLine - 0.5);
                        const yBottom = yAxis.getPixelForValue(startLine + numPhaseLines - 0.5);
                        const yMid = (yTop + yBottom) / 2;

                        // Convertir la couleur hex en rgba pour le fond
                        const r = parseInt(phase.color.slice(1, 3), 16);
                        const g = parseInt(phase.color.slice(3, 5), 16);
                        const b = parseInt(phase.color.slice(5, 7), 16);

                        // Fond légèrement coloré dans la marge de gauche
                        const labelAreaRight = xAxis.left;
                        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.08)`;
                        ctx.fillRect(0, yTop, labelAreaRight, yBottom - yTop);

                        // Barre verticale de couleur à gauche
                        ctx.fillStyle = phase.color;
                        ctx.fillRect(labelAreaRight - 4, yTop + 2, 4, yBottom - yTop - 4);

                        // Texte du nom de phase
                        ctx.fillStyle = phase.color;
                        ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
                        ctx.textAlign = 'left';
                        ctx.textBaseline = 'middle';
                        const labelX = 8;
                        const maxLabelWidth = labelAreaRight - 20;

                        // Afficher le nom sur plusieurs lignes si trop long
                        const phaseName = phase.name || ('Phase ' + (entryIndex + 1));
                        const phaseLineHeight = 14;
                        if (ctx.measureText(phaseName).width <= maxLabelWidth) {
                            ctx.fillText(phaseName, labelX, yMid);
                        } else {
                            // Découper en mots et répartir sur plusieurs lignes
                            const words = phaseName.split(' ');
                            const phaseLines = [];
                            let currentLine = '';
                            for (const word of words) {
                                const test = currentLine ? currentLine + ' ' + word : word;
                                if (ctx.measureText(test).width <= maxLabelWidth) {
                                    currentLine = test;
                                } else {
                                    if (currentLine) phaseLines.push(currentLine);
                                    currentLine = word;
                                }
                            }
                            if (currentLine) phaseLines.push(currentLine);
                            const totalTextHeight = phaseLines.length * phaseLineHeight;
                            const startY = yMid - totalTextHeight / 2 + phaseLineHeight / 2;
                            phaseLines.forEach((line, i) => {
                                ctx.fillText(line, labelX, startY + i * phaseLineHeight);
                            });
                        }

                        // Séparateur horizontal entre phases (sauf avant la première)
                        if (entryIndex > 0) {
                            ctx.beginPath();
                            ctx.moveTo(0, yTop);
                            ctx.lineTo(xAxis.right, yTop);
                            ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.4)`;
                            ctx.lineWidth = 1.5;
                            ctx.stroke();
                        }
                    });

                    ctx.restore();
                }
            }
        });

        Chart.register({
            id: 'milestonePlugin',
            afterDatasetsDraw: function(chart) {
                const ctx = chart.ctx;
                const xAxis = chart.scales.x;
                const yAxis = chart.scales.y;

                // Récupérer les données depuis les options du chart
                const ganttData = chart.options.ganttData;
                const milestones = chart.options.milestonesData;
                const phases = chart.options.phasesData;

                if (!milestones || !phases) return;

                // En mode cascade, les jalons sont ENTRE les lanes (Y non-entier)
                if (ganttViewMode === 'cascade') {
                    milestones.forEach(milestone => {
                        const task = milestone.task;
                        const phase = milestone.phase;
                        const yPosition = milestone.yPosition;

                        const x = xAxis.getPixelForValue(milestone.date);
                        // IMPORTANT: yPosition est déjà non-entier (ex: 0.5, 1.5) pour être ENTRE les lanes
                        const y = yAxis.getPixelForValue(yPosition);

                        const date = new Date(task.startDate);
                        const dateStr = `${date.getDate()}/${date.getMonth() + 1}`;

                        const phaseColor = phase ? phase.color : '#0071e3';

                        // Dessiner la gélule (rectangle avec coins arrondis)
                        const capsuleWidth = 42;
                        const capsuleHeight = 16;
                        const radius = 8;

                        ctx.save();
                        ctx.beginPath();
                        ctx.roundRect(x - capsuleWidth / 2, y - capsuleHeight / 2, capsuleWidth, capsuleHeight, radius);
                        ctx.fillStyle = phaseColor;
                        ctx.fill();
                        ctx.strokeStyle = phaseColor;
                        ctx.lineWidth = 1;
                        ctx.stroke();

                        // Dessiner le texte (date)
                        ctx.fillStyle = 'white';
                        ctx.font = 'bold 10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText(dateStr, x, y);
                        ctx.restore();
                    });
                } else {
                    // Modes groupe, compact et consolidé : utiliser l'ancienne méthode (jalons dans ganttData)
                    const labels = chart.data.labels;
                    if (!ganttData) return;

                    ganttData.forEach((dataPoint, index) => {
                        if (dataPoint.isMilestone) {
                            const x = xAxis.getPixelForValue(dataPoint.x[0]);
                            let y = yAxis.getPixelForValue(dataPoint.y);

                            // En mode compact, décaler le jalon vers le bas pour qu'il apparaisse sous la tâche
                            if (dataPoint.compactMode) {
                                y += 28; // Adapté aux barres de 40px
                            }

                            // Utiliser dataPoint.task si disponible, sinon chercher par index
                            const task = dataPoint.task || phases.flatMap(p => p.tasks).find((t, i) => i === index);
                            if (!task) return;

                            const date = new Date(task.startDate);
                            const dateStr = `${date.getDate()}/${date.getMonth() + 1}`;

                            const phase = phases.find(p => p.tasks.some(t => t.id === task.id));
                            const phaseColor = phase ? phase.color : '#0071e3';

                            const capsuleWidth = 42;
                            const capsuleHeight = 16;
                            const radius = 8;

                            ctx.save();
                            ctx.beginPath();
                            ctx.roundRect(x - capsuleWidth / 2, y - capsuleHeight / 2, capsuleWidth, capsuleHeight, radius);
                            ctx.fillStyle = phaseColor;
                            ctx.fill();
                            ctx.strokeStyle = phaseColor;
                            ctx.lineWidth = 1;
                            ctx.stroke();

                            ctx.fillStyle = 'white';
                            ctx.font = 'bold 10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
                            ctx.textAlign = 'center';
                            ctx.textBaseline = 'middle';
                            ctx.fillText(dateStr, x, y);
                            ctx.restore();
                        }
                    });
                }
            }
        });

        // Plugin pour afficher les titres des tâches avec gestion des recouvrements et multi-lignes
        Chart.register({
            id: 'taskLabelsPlugin',
            afterDatasetsDraw: function(chart) {
                // Actif en mode compact et consolidé
                if (ganttViewMode !== 'compact' && ganttViewMode !== 'consolide') return;

                const ctx = chart.ctx;
                const xAxis = chart.scales.x;
                const yAxis = chart.scales.y;
                const ganttData = chart.options.ganttData;
                
                if (!ganttData) return;

                ctx.save();
                ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI"';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';

                // Fonction utilitaire pour découper le texte en 2 lignes équilibrées
                function getBalancedLines(ctx, text, maxWidth) {
                    const totalWidth = ctx.measureText(text).width;
                    
                    // Cas 1 : Ça tient sur une seule ligne
                    if (totalWidth <= maxWidth) {
                        return [text];
                    }

                    const words = text.split(" ");
                    if (words.length <= 1) return [text]; // Impossible de couper un seul mot

                    // Cas 2 : Trouver le point de coupure qui équilibre le mieux les largeurs
                    let bestSplitIndex = 1;
                    let minDifference = Infinity;

                    // Tester toutes les positions de coupure possibles
                    for (let i = 1; i < words.length; i++) {
                        const line1 = words.slice(0, i).join(" ");
                        const line2 = words.slice(i).join(" ");
                        
                        const w1 = ctx.measureText(line1).width;
                        const w2 = ctx.measureText(line2).width;
                        
                        const diff = Math.abs(w1 - w2);
                        
                        if (diff < minDifference) {
                            minDifference = diff;
                            bestSplitIndex = i;
                        }
                    }

                    // Retourner exactement 2 lignes équilibrées
                    return [
                        words.slice(0, bestSplitIndex).join(" "),
                        words.slice(bestSplitIndex).join(" ")
                    ];
                }

                // Organiser par ligne
                const itemsByLine = {};
                ganttData.forEach((d, i) => {
                    if (!itemsByLine[d.y]) itemsByLine[d.y] = [];
                    itemsByLine[d.y].push({ ...d, index: i });
                });

                // Altitudes ajustées pour barres de 40px (bords à +/- 20px)
                // 4 niveaux suffisent avec l'espacement réduit
                const altitudes = [-35, 42, -50, 58, -65, 75];
                const lineHeight = 12;
                
                const allLineKeys = Object.keys(itemsByLine).map(Number).sort((a, b) => a - b);
                const maxLineIndex = allLineKeys.length > 0 ? allLineKeys[allLineKeys.length - 1] : 0;

                Object.keys(itemsByLine).forEach(yIndex => {
                    const lineItems = itemsByLine[yIndex];
                    const isLastLine = Number(yIndex) === maxLineIndex;
                    
                    // Trier par position X
                    lineItems.sort((a, b) => a.x[0] - b.x[0]);

                    // Suivi de la fin du dernier texte pour chaque niveau d'altitude
                    const lastTextEnd = altitudes.map(() => -9999);

                    lineItems.forEach(itemData => {
                        const task = itemData.task;
                        if (!task) return;

                        const xStart = xAxis.getPixelForValue(itemData.x[0]);
                        const xEnd = xAxis.getPixelForValue(itemData.x[1]);

                        // Centrage : sur la date exacte pour les jalons, au milieu de la barre pour les tâches
                        const xCenter = itemData.isMilestone ? xStart : (xStart + xEnd) / 2;

                        const yCenter = yAxis.getPixelForValue(itemData.y);

                        const boxWidth = xEnd - xStart;
                        const label = task.title;
                        const inBarPadding = 16; // marge intérieure

                        // === TENTATIVE : texte DANS la barre ===
                        if (!itemData.isMilestone && boxWidth > 60) {
                            const barColor = itemData.color || '#1d1d1f';
                            const singleLineWidth = ctx.measureText(label).width;
                            if (singleLineWidth <= boxWidth - inBarPadding) {
                                // Tient sur 1 ligne dans la barre
                                ctx.fillStyle = barColor;
                                ctx.fillText(label, xCenter, yCenter);
                                return; // Pas de déport
                            }
                            // Essayer sur 2 lignes
                            const inBarLines = getBalancedLines(ctx, label, boxWidth - inBarPadding);
                            let maxW = 0;
                            inBarLines.forEach(l => { const w = ctx.measureText(l).width; if (w > maxW) maxW = w; });
                            if (inBarLines.length <= 2 && maxW <= boxWidth - inBarPadding) {
                                ctx.fillStyle = barColor;
                                inBarLines.forEach((lt, li) => {
                                    const ly = yCenter + (li - (inBarLines.length - 1) / 2) * lineHeight;
                                    ctx.fillText(lt, xCenter, ly);
                                });
                                return; // Pas de déport
                            }
                        }

                        // === FALLBACK : texte déporté (comportement original) ===
                        // Calcul de la largeur max dynamique — plafonné pour éviter les étiquettes géantes
                        const dynamicMaxWidth = Math.min(Math.max(boxWidth, 100), 180);

                        // Découpage du texte équilibré (max 2 lignes)
                        const lines = getBalancedLines(ctx, label, dynamicMaxWidth);

                        // Calculer la largeur max pour la collision
                        let maxLineWidth = 0;
                        lines.forEach(l => {
                            const w = ctx.measureText(l).width;
                            if (w > maxLineWidth) maxLineWidth = w;
                        });

                        const textWidth = maxLineWidth;
                        const textStart = xCenter - (textWidth / 2);
                        const textEnd = xCenter + (textWidth / 2);
                        const padding = 30;

                        // Trouver le meilleur niveau parmi tous (haut et bas)
                        // Préférence : bas d'abord (1,3,5) puis haut (0,2,4)
                        let chosenLevel = 0;
                        const preferredOrder = [1, 0, 3, 2, 5, 4]; // alterner bas/haut

                        let placed = false;
                        for (const i of preferredOrder) {
                            if (textStart > lastTextEnd[i] + padding) {
                                chosenLevel = i;
                                placed = true;
                                break;
                            }
                        }
                        // Fallback : trouver le niveau avec le moins de chevauchement
                        if (!placed) {
                            let bestOverlap = Infinity;
                            for (const i of preferredOrder) {
                                const overlap = lastTextEnd[i] + padding - textStart;
                                if (overlap < bestOverlap) {
                                    bestOverlap = overlap;
                                    chosenLevel = i;
                                }
                            }
                        }

                        lastTextEnd[chosenLevel] = textEnd;
                        const basePos = yCenter + altitudes[chosenLevel];
                        const color = itemData.color || '#1d1d1f';

                        // 1. Dessiner la tige de liaison
                        ctx.beginPath();
                        ctx.strokeStyle = color;
                        ctx.lineWidth = 1;
                        ctx.setLineDash([2, 2]);

                        if (itemData.isMilestone) {
                            // JALON : La tige part du jalon (+45px + 8px de rayon)
                            ctx.moveTo(xCenter, yCenter + 28);
                            ctx.lineTo(xCenter, basePos - 8);
                        } else if (altitudes[chosenLevel] < 0) {
                            // Vers le haut (Tâche) : part du bord haut de la grosse barre (-30px)
                            ctx.moveTo(xCenter, yCenter - 20);
                            ctx.lineTo(xCenter, basePos + 8);
                        } else {
                            // Vers le bas (Tâche) : part du bord bas de la barre (+20px)
                            ctx.moveTo(xCenter, yCenter + 20);
                            ctx.lineTo(xCenter, basePos - 8);
                        }
                        ctx.stroke();
                        ctx.setLineDash([]);

                        // 2. Dessiner le texte
                        ctx.lineJoin = 'round';
                        ctx.lineWidth = 3;
                        ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
                        ctx.fillStyle = color;

                        lines.forEach((lineText, lineIndex) => {
                            let lineY;
                            if (altitudes[chosenLevel] < 0) {
                                // AU-DESSUS : Alignement "bas" du bloc de texte (empilement vers le haut)
                                // La dernière ligne touche presque la tige
                                lineY = basePos - (lines.length - 1 - lineIndex) * lineHeight;
                            } else {
                                // EN-DESSOUS : Alignement "haut" du bloc de texte (empilement vers le bas)
                                // La première ligne touche presque la tige
                                lineY = basePos + (lineIndex * lineHeight);
                            }

                            // Halo
                            ctx.strokeText(lineText, xCenter, lineY);
                            // Texte
                            ctx.fillText(lineText, xCenter, lineY);
                        });
                    });
                });

                ctx.restore();
            }
        });

        // Plugin pour afficher les titres DANS les barres en mode cascade (quand ça tient)
        Chart.register({
            id: 'cascadeInBarLabelsPlugin',
            afterDatasetsDraw: function(chart) {
                if (ganttViewMode !== 'cascade') return;

                const ctx = chart.ctx;
                const xAxis = chart.scales.x;
                const yAxis = chart.scales.y;
                const ganttData = chart.options.ganttData;

                if (!ganttData) return;

                ctx.save();
                ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI"';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';

                const lineHeight = 12;
                const inBarPadding = 16;

                ganttData.forEach((dataPoint) => {
                    if (dataPoint.isMilestone) return;
                    const task = dataPoint.task;
                    if (!task) return;

                    const xStart = xAxis.getPixelForValue(dataPoint.x[0]);
                    const xEnd = xAxis.getPixelForValue(dataPoint.x[1]);
                    const barWidth = xEnd - xStart;
                    const xCenter = (xStart + xEnd) / 2;
                    const yCenter = yAxis.getPixelForValue(dataPoint.y);

                    if (barWidth < 60) return; // Trop petit, on ne tente pas

                    const label = task.title;
                    const singleW = ctx.measureText(label).width;

                    // Trouver la couleur de la phase (= couleur de bordure)
                    const phases = chart.options.phasesData;
                    const phase = phases ? phases.find(p => p.tasks.some(t => t.id === task.id)) : null;
                    const barColor = phase ? phase.color : '#1d1d1f';

                    if (singleW <= barWidth - inBarPadding) {
                        ctx.fillStyle = barColor;
                        ctx.fillText(label, xCenter, yCenter);
                    } else {
                        // Essayer sur 2 lignes
                        const words = label.split(' ');
                        if (words.length < 2) return;
                        let bestSplit = 1, minDiff = Infinity;
                        for (let i = 1; i < words.length; i++) {
                            const w1 = ctx.measureText(words.slice(0, i).join(' ')).width;
                            const w2 = ctx.measureText(words.slice(i).join(' ')).width;
                            const diff = Math.abs(w1 - w2);
                            if (diff < minDiff) { minDiff = diff; bestSplit = i; }
                        }
                        const l1 = words.slice(0, bestSplit).join(' ');
                        const l2 = words.slice(bestSplit).join(' ');
                        const maxW = Math.max(ctx.measureText(l1).width, ctx.measureText(l2).width);
                        if (maxW <= barWidth - inBarPadding) {
                            ctx.fillStyle = barColor;
                            ctx.fillText(l1, xCenter, yCenter - lineHeight / 2);
                            ctx.fillText(l2, xCenter, yCenter + lineHeight / 2);
                        }
                    }
                });

                ctx.restore();
            }
        });

        // Variables pour le drag & drop
        let isDragging = false;
        let draggedTaskIndex = null;
        let dragStartDate = null;
        let dragStartX = 0;
        let snapLines = []; // Lignes verticales de repère
        let draggedMilestone = null; // Jalon en cours de drag
        let draggedMilestoneData = null; // Données du jalon en cours de drag (yPosition, etc.)

        // Variables pour le redimensionnement
        let isResizing = false;
        let resizeEdge = null; // 'left' ou 'right'
        let resizeTaskIndex = null;
        let resizeStartDate = null;
        let resizeEndDate = null;

        // Enregistrer le plugin de drag & drop
        Chart.register({
            id: 'dragDropPlugin',
            defaultFontColor: '#666',

            // Dessiner les lignes de repère pendant le drag
            afterDraw: function(chart) {
                if (isDragging && snapLines.length > 0) {
                    const ctx = chart.ctx;
                    const xAxis = chart.scales.x;
                    const yAxis = chart.scales.y;

                    snapLines.forEach(x => {
                        ctx.save();
                        ctx.beginPath();
                        ctx.moveTo(x, yAxis.top);
                        ctx.lineTo(x, yAxis.bottom);
                        ctx.strokeStyle = 'rgba(0, 113, 227, 0.5)';
                        ctx.lineWidth = 2;
                        ctx.setLineDash([5, 5]);
                        ctx.stroke();
                        ctx.restore();
                    });
                }
            }
        });

        // Créer le conteneur pour les boutons de séparation
        const ganttChartCanvas = document.getElementById('ganttChart');
        if (ganttChartCanvas) {
            // Créer un conteneur overlay pour les boutons
            let separatorOverlay = document.getElementById('gantt-separator-overlay');
            if (!separatorOverlay) {
                separatorOverlay = document.createElement('div');
                separatorOverlay.id = 'gantt-separator-overlay';
                separatorOverlay.style.cssText = `
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    pointer-events: none;
                    z-index: 1000;
                    display: none;
                `;
                ganttChartCanvas.parentElement.style.position = 'relative';
                ganttChartCanvas.parentElement.appendChild(separatorOverlay);
            }
        }

        // Variables pour le suivi de la souris
        let ganttMouseY = 0;
        let ganttMouseX = 0;
        let visibleSeparatorLane = null;
        let visibleSeparatorPhaseId = null;
        let isHoveringButtons = false; // Pour éviter de cacher quand on est sur les boutons
        let hideSeparatorTimeout = null; // Pour ajouter un délai avant de cacher
        let activeSeparatorY = null; // Mémoriser la ligne de séparation active
        let activeInsertPosition = null; // Mémoriser la position d'insertion active
        let activeDate = null; // Mémoriser la date correspondant à la position X de la souris

        // Enregistrer le plugin de séparation pour le Gantt
        Chart.register({
            id: 'ganttSeparatorPlugin',

            // Dessiner les lignes de séparation au survol
            afterDraw: function(chart) {
                const ctx = chart.ctx;
                const xAxis = chart.scales.x;
                const yAxis = chart.scales.y;
                const canvas = chart.canvas;

                // Ne pas afficher pendant le drag ou le resize
                if (isDragging || isResizing) {
                    hideSeparatorButtons();
                    return;
                }

                // Calculer la position de la souris dans le chart
                const rect = canvas.getBoundingClientRect();
                const mouseY = ganttMouseY - rect.top;
                const mouseX = ganttMouseX - rect.left;

                // Vérifier si la souris est dans la zone du chart
                if (mouseY < yAxis.top || mouseY > yAxis.bottom ||
                    mouseX < xAxis.left || mouseX > xAxis.right) {
                    hideSeparatorButtons();
                    return;
                }

                // v2.1.3 : JAMAIS d'affordance « + » quand la souris est SUR une
                // barre — en consolidé/compact les frontières de lanes peuvent
                // traverser les barres, et le bouton volait alors le clic en
                // empêchant le drag & drop. L'affordance reste disponible dans
                // les zones vides (et sous les barres, comme en cascade).
                const gdGuard = chart.options.ganttData || [];
                const metaGuard = chart.getDatasetMeta(0);
                for (let gi = 0; gi < gdGuard.length; gi++) {
                    const elG = metaGuard.data[gi];
                    if (!elG) continue;
                    const gx0 = Math.min(elG.base, elG.x);
                    const gx1 = Math.max(elG.base, elG.x);
                    let gyC = elG.y;
                    if (gdGuard[gi].isMilestone && gdGuard[gi].compactMode &&
                        ganttViewMode === 'compact') gyC += 28;
                    const gHalf = ((elG.height || 35) / 2) + 4;
                    if (mouseX >= gx0 - 4 && mouseX <= gx1 + 4 &&
                        mouseY >= gyC - gHalf && mouseY <= gyC + gHalf) {
                        hideSeparatorButtons();
                        return;
                    }
                }

                // IMPORTANT: En mode cascade, les lanes correspondent aux tâches normales seulement
                // Les jalons sont ENTRE les lanes, donc ne comptent pas pour le nombre de lanes
                let totalLanes = yAxis.ticks.length;
                if (ganttViewMode === 'cascade') {
                    // En mode cascade, le nombre de lanes est le nombre de tâches normales (ganttData.length)
                    totalLanes = chart.options.ganttData.length;
                }

                // Trouver entre quelles lanes la souris se trouve
                const laneHeight = (yAxis.bottom - yAxis.top) / totalLanes;

                // Trouver la lane actuelle
                const relativeY = mouseY - yAxis.top;
                const laneIndex = Math.round(relativeY / laneHeight);

                // Vérifier si on est près d'une ligne de séparation (bord de lane)
                // Les lignes de séparation sont à : yAxis.top + (i * laneHeight)
                const tolerance = 8; // pixels de tolérance de chaque côté de la ligne

                let separatorY = null;
                let insertPosition = null;

                // Vérifier la ligne de séparation au-dessus de la lane actuelle
                const topSeparatorY = yAxis.top + (laneIndex * laneHeight);
                if (Math.abs(mouseY - topSeparatorY) < tolerance) {
                    separatorY = topSeparatorY;
                    insertPosition = laneIndex;
                }

                // Vérifier la ligne de séparation en-dessous de la lane actuelle
                const bottomSeparatorY = yAxis.top + ((laneIndex + 1) * laneHeight);
                if (Math.abs(mouseY - bottomSeparatorY) < tolerance) {
                    separatorY = bottomSeparatorY;
                    insertPosition = laneIndex + 1;
                }

                // Vérifier si on est près de la ligne de séparation active (avec tolérance élargie pour les boutons)
                const buttonTolerance = 25; // Tolérance élargie pour inclure la zone des boutons
                if (separatorY === null && activeSeparatorY !== null) {
                    if (Math.abs(mouseY - activeSeparatorY) < buttonTolerance) {
                        // On est encore dans la zone de la ligne de séparation active
                        separatorY = activeSeparatorY;
                        insertPosition = activeInsertPosition;
                    }
                }

                if (separatorY !== null && insertPosition !== null) {
                    // On est sur une ligne de séparation entre deux lanes
                    // Mémoriser la ligne active
                    activeSeparatorY = separatorY;
                    activeInsertPosition = insertPosition;

                    // Calculer la date correspondant à la position X de la souris
                    const mouseXValue = xAxis.getValueForPixel(mouseX);
                    activeDate = new Date(mouseXValue);

                    // Vérifier si la souris est sur un jalon existant
                    let isHoveringMilestone = false;
                    const milestonesData = chart.options.milestonesData;
                    if (milestonesData && milestonesData.length > 0) {
                        const mouseTimestamp = mouseXValue;
                        for (const milestone of milestonesData) {
                            const milestoneTimestamp = milestone.date;
                            const tolerance = 2 * 24 * 60 * 60 * 1000; // 2 jours de tolérance
                            if (Math.abs(mouseTimestamp - milestoneTimestamp) < tolerance) {
                                isHoveringMilestone = true;
                                break;
                            }
                        }
                    }

                    // Si on est sur un jalon, ne pas afficher les boutons
                    if (isHoveringMilestone) {
                        hideSeparatorButtons();
                        return;
                    }

                    // Dessiner la ligne de séparation
                    ctx.save();
                    ctx.beginPath();
                    ctx.moveTo(xAxis.left, separatorY);
                    ctx.lineTo(xAxis.right, separatorY);
                    ctx.strokeStyle = 'rgba(0, 113, 227, 0.6)';
                    ctx.lineWidth = 2;
                    ctx.setLineDash([8, 4]);
                    ctx.stroke();
                    ctx.restore();

                    // Afficher les boutons avec la position X de la souris
                    showSeparatorButtons(insertPosition, xAxis.left, separatorY, mouseX, canvas, chart);
                } else {
                    // On s'éloigne de la ligne de séparation, réinitialiser après un délai
                    scheduleHideSeparatorButtons();
                }
            }
        });

        // Fonction pour afficher les boutons de séparation
        function showSeparatorButtons(insertPosition, chartLeft, separatorY, mouseX, canvas, chart) {
            const separatorOverlay = document.getElementById('gantt-separator-overlay');
            if (!separatorOverlay) return;

            // IMPORTANT: Utiliser riskGroups directement pour garantir la synchronisation
            // car phases peut ne pas être à jour après ajout/suppression de tâches
            const currentGroups = riskGroups;

            // Trouver la phase et la position d'insertion
            let currentPhaseId = null;
            let positionInPhase = 0;
            let tasksSeen = 0;

            console.log('=== DEBUG insertPosition ===', insertPosition);
            console.log('=== riskGroups actuels ===', currentGroups.map(g => `${g.id}: ${g.tasks.length} tâches [${g.tasks.map(t => t.id + (t.isMilestone ? '★' : '')).join(', ')}]`));

            for (const group of currentGroups) {
                console.log(`Groupe ${group.id}: ${group.tasks.length} tâches totales`, group.tasks.map(t => `${t.id} (${t.isMilestone ? 'jalon' : 'tâche'})`));
                // Compter TOUTES les tâches (y compris les jalons) pour la position d'insertion
                if (tasksSeen + group.tasks.length >= insertPosition) {
                    currentPhaseId = group.id;
                    positionInPhase = insertPosition - tasksSeen;
                    console.log(`--> Phase trouvée: ${currentPhaseId}, positionInPhase: ${positionInPhase}`);
                    break;
                }
                tasksSeen += group.tasks.length;
            }

            // Si même position que précédent, ne pas redessiner
            // Vérifier si la position a changé (incluant la date)
            const dateChanged = activeDate && visibleSeparatorLane === insertPosition && visibleSeparatorPhaseId === currentPhaseId;
            if (dateChanged && !activeDate) {
                return;
            }

            visibleSeparatorLane = insertPosition;
            visibleSeparatorPhaseId = currentPhaseId;

            const rect = canvas.getBoundingClientRect();
            const xAxis = chart.scales.x;

            // separatorY est en pixels internes du canvas
            // Il faut convertir en pixels CSS pour le positionnement
            const pixelRatio = rect.height / canvas.height;
            const pixelRatioX = rect.width / canvas.width;
            const separatorYCSS = separatorY * pixelRatio;

            // Position X des boutons (convertir de pixels internes à pixels CSS)
            const mouseXCSS = mouseX * pixelRatioX;

            // Formater la date pour le dataset
            const dateStr = activeDate ? activeDate.toISOString().split('T')[0] : '';

            // Créer le HTML des boutons
            separatorOverlay.innerHTML = `
                <div class="gantt-add-buttons-container" style="
                    position: absolute;
                    left: ${mouseXCSS}px;
                    top: ${separatorYCSS}px;
                    transform: translate(-50%, -50%);
                    pointer-events: auto;
                ">
                    <!-- Petit bouton + principal -->
                    <div class="gantt-add-trigger" style="
                        width: 20px;
                        height: 20px;
                        border-radius: 50%;
                        background: #E0E0E0;
                        color: #666;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 14px;
                        font-weight: bold;
                        cursor: pointer;
                        box-shadow: 0 2px 6px rgba(0,0,0,0.15);
                        z-index: 10;
                    ">+</div>

                    <!-- Menu avec les options (caché par défaut) -->
                    <div class="gantt-add-menu" style="
                        display: none;
                        position: absolute;
                        left: 20px;
                        top: 50%;
                        transform: translateY(-50%);
                        background: white;
                        border-radius: 8px;
                        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
                        padding: 4px;
                        z-index: 11;
                    ">
                        <button class="gantt-add-milestone-btn" data-phase-id="${currentPhaseId}" data-position="${positionInPhase}" data-date="${dateStr}"
                            style="
                                display: flex;
                                align-items: center;
                                gap: 8px;
                                width: 100%;
                                padding: 8px 12px;
                                background: transparent;
                                border: none;
                                border-radius: 6px;
                                cursor: pointer;
                                font-size: 13px;
                                font-weight: 500;
                                color: #333;
                                white-space: nowrap;
                            " onmouseover="this.style.background='rgba(175, 82, 222, 0.1)';"
                               onmouseout="this.style.background='transparent';">
                            <span style="color: #AF52D6; font-size: 16px;">◆</span>
                            <span>${t('addMilestone')}</span>
                        </button>
                        <button class="gantt-add-task-btn" data-phase-id="${currentPhaseId}" data-position="${positionInPhase}" data-date="${dateStr}"
                            style="
                                display: flex;
                                align-items: center;
                                gap: 8px;
                                width: 100%;
                                padding: 8px 12px;
                                background: transparent;
                                border: none;
                                border-radius: 6px;
                                cursor: pointer;
                                font-size: 13px;
                                font-weight: 500;
                                color: #333;
                                white-space: nowrap;
                            " onmouseover="this.style.background='rgba(0, 113, 227, 0.1)';"
                               onmouseout="this.style.background='transparent';">
                            <span style="color: #0071E3; font-size: 16px;">+</span>
                            <span>${t('addRisk')}</span>
                        </button>
                    </div>
                </div>
            `;

            separatorOverlay.style.display = 'block';

            // Attacher les événements sur le conteneur
            const container = separatorOverlay.querySelector('.gantt-add-buttons-container');
            const trigger = separatorOverlay.querySelector('.gantt-add-trigger');
            const menu = separatorOverlay.querySelector('.gantt-add-menu');

            if (container && trigger && menu) {
                // Au clic sur le bouton +, afficher le menu
                trigger.addEventListener('click', (e) => {
                    e.stopPropagation();
                    isHoveringButtons = true;
                    if (hideSeparatorTimeout) {
                        clearTimeout(hideSeparatorTimeout);
                        hideSeparatorTimeout = null;
                    }
                    menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
                });

                // Au survol du conteneur, empêcher de cacher
                container.addEventListener('mouseenter', () => {
                    isHoveringButtons = true;
                    if (hideSeparatorTimeout) {
                        clearTimeout(hideSeparatorTimeout);
                        hideSeparatorTimeout = null;
                    }
                });

                // Au sortie du conteneur, cacher le menu et planifier le cache
                container.addEventListener('mouseleave', () => {
                    isHoveringButtons = false;
                    menu.style.display = 'none';
                    scheduleHideSeparatorButtons();
                });
            }

            // Attacher les événements de clic
            const taskBtn = separatorOverlay.querySelector('.gantt-add-task-btn');
            const milestoneBtn = separatorOverlay.querySelector('.gantt-add-milestone-btn');

            if (taskBtn) {
                taskBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const phaseId = parseInt(taskBtn.dataset.phaseId);
                    const position = parseInt(taskBtn.dataset.position);
                    const date = taskBtn.dataset.date;
                    addNewRiskAtPosition(phaseId, position, false, date, chart);
                    hideSeparatorButtons();
                });
            }

            if (milestoneBtn) {
                milestoneBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const phaseId = parseInt(milestoneBtn.dataset.phaseId);
                    const position = parseInt(milestoneBtn.dataset.position);
                    const date = milestoneBtn.dataset.date;
                    addNewRiskAtPosition(phaseId, position, true, date);
                    hideSeparatorButtons();
                });
            }
        }

        // Fonction pour cacher les boutons de séparation
        function hideSeparatorButtons() {
            const separatorOverlay = document.getElementById('gantt-separator-overlay');
            if (separatorOverlay) {
                separatorOverlay.style.display = 'none';
                separatorOverlay.innerHTML = '';
            }
            visibleSeparatorLane = null;
            visibleSeparatorPhaseId = null;
            isHoveringButtons = false;
        }

        // Fonction pour planifier le cache des boutons (avec délai)
        function scheduleHideSeparatorButtons() {
            // Annuler le timeout précédent s'il existe
            if (hideSeparatorTimeout) {
                clearTimeout(hideSeparatorTimeout);
            }

            // Si on est en hover sur les boutons, ne pas cacher
            if (isHoveringButtons) {
                return;
            }

            // Cacher après 100ms et réinitialiser la ligne active
            hideSeparatorTimeout = setTimeout(() => {
                if (!isHoveringButtons) {
                    hideSeparatorButtons();
                    activeSeparatorY = null;
                    activeInsertPosition = null;
                }
            }, 100);
        }

        // Suivre le mouvement de la souris sur le canvas
        if (ganttChartCanvas) {
            ganttChartCanvas.addEventListener('mousemove', function(e) {
                ganttMouseX = e.clientX;
                ganttMouseY = e.clientY;
                if (ganttChart) {
                    ganttChart.draw('none'); // Redessiner pour mettre à jour les séparateurs
                }
            });

            // Cacher les séparateurs quand la souris quitte le canvas
            ganttChartCanvas.addEventListener('mouseleave', function() {
                hideSeparatorButtons();
                if (ganttChart) {
                    ganttChart.draw('none');
                }
            });
        }

        // Fonction pour calculer les dates de repère (snap targets)
        function getSnapTargets(excludeTaskIndex) {
            const targets = [];

            // Ajouter les dates de début et fin de toutes les tâches
            phases.forEach(phase => {
                phase.tasks.forEach((task, idx) => {
                    const globalIndex = phases.flatMap(p => p.tasks).findIndex((t, i) => t === task);
                    if (globalIndex !== excludeTaskIndex) {
                        // Date de début
                        targets.push({
                            date: new Date(task.startDate).getTime(),
                            type: 'start',
                            taskId: task.id
                        });
                        // Date de fin (si pas un jalon)
                        if (!task.isMilestone && task.endDate) {
                            targets.push({
                                date: new Date(task.endDate).getTime(),
                                type: 'end',
                                taskId: task.id
                            });
                        }
                    }
                });
            });

            // Ajouter les dates remarquables (débuts de mois et années)
            const allDates = phases.flatMap(p => p.tasks.map(t => new Date(t.startDate).getTime()));
            if (allDates.length > 0) {
                const minDate = new Date(Math.min(...allDates));
                const maxDate = new Date(Math.max(...allDates));

                // Ajouter le 1er de chaque mois dans la plage
                let current = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
                const endDate = new Date(maxDate.getFullYear(), maxDate.getMonth() + 2, 1);

                while (current <= endDate) {
                    targets.push({
                        date: current.getTime(),
                        type: 'month',
                        taskId: null
                    });
                    current.setMonth(current.getMonth() + 1);
                }

                // Ajouter le 1er janvier de chaque année dans la plage
                current = new Date(minDate.getFullYear(), 0, 1);
                while (current <= endDate) {
                    targets.push({
                        date: current.getTime(),
                        type: 'year',
                        taskId: null
                    });
                    current.setFullYear(current.getFullYear() + 1);
                }
            }

            // Trier par date
            return targets.sort((a, b) => a.date - b.date);
        }

        // Fonction pour trouver la date la plus proche (magnétisme)
        function findSnapDate(currentDate, targets, threshold = 2 * 86400000) { // 2 jours en ms
            let closest = null;
            let minDistance = threshold;

            targets.forEach(target => {
                const distance = Math.abs(target.date - currentDate);
                if (distance < minDistance) {
                    minDistance = distance;
                    closest = target;
                }
            });

            return closest;
        }

        function updateGantt() {
            const canvas = document.getElementById('ganttChart');
            if (!canvas) return;

            const ctx = canvas.getContext('2d');

            // Détruire l'ancien chart s'il existe
            if (ganttChart) {
                ganttChart.destroy();
                ganttChart = null;
            }

            // IMPORTANT: Reconstruire phases à partir de riskGroups
            const phases = riskGroups.map(group => ({
                id: group.id,
                name: group.name,
                description: group.description,
                tasks: [...group.tasks],
                color: group.color
            }));

            // --- CALCUL DE LA HAUTEUR DYNAMIQUE ---
            let numLines = 0;
            const allTasks = phases.flatMap(p => p.tasks);
            let compactedLines = [];
            let consolidatedLayout = null;

            if (ganttViewMode === 'cascade') {
                numLines = allTasks.length;
            } else if (ganttViewMode === 'consolide') {
                // Compacter les tâches PHASE PAR PHASE
                let totalLines = 0;
                consolidatedLayout = [];
                phases.forEach(phase => {
                    const phaseCompacted = compactTasksAndMilestones(phase.tasks);
                    consolidatedLayout.push({
                        phase: phase,
                        startLine: totalLines,
                        numLines: phaseCompacted.length,
                        compactedLines: phaseCompacted
                    });
                    totalLines += phaseCompacted.length;
                });
                numLines = totalLines;
            } else {
                compactedLines = compactTasksAndMilestones(allTasks);
                numLines = compactedLines.length;
            }

            // Hauteur par ligne : 90px en compact/consolidé (réduit car les labels tiennent souvent dans les barres), 60px en cascade
            const minHeightPerLine = (ganttViewMode === 'compact' || ganttViewMode === 'consolide') ? 90 : 60;
            const targetHeight = Math.max(450, numLines * minHeightPerLine);
            canvas.parentElement.style.height = targetHeight + 'px';

            // Redimensionner le canvas
            canvas.width = canvas.parentElement.offsetWidth;
            canvas.height = canvas.parentElement.offsetHeight;


            // Calculer les dates min/max pour le projet (en ignorant les jalons sans endDate)
            const allDates = phases.flatMap(p => p.tasks.map(t => {
                const dates = [new Date(t.startDate).getTime()];
                if (t.endDate && !t.isMilestone) {
                    dates.push(new Date(t.endDate).getTime());
                }
                return dates;
            })).flat();
            const minDate = Math.min(...allDates);
            const maxDate = Math.max(...allDates);
            const dayMs = 86400000; // Nombre de ms par jour

            // Préparer les données pour le Gantt
            const ganttData = [];
            const labels = [];
            const colors = [];
            const milestones = []; // Stocker les jalons séparément

            if (ganttViewMode === 'cascade') {
                // Mode Cascade : les tâches ont leur lane, les jalons sont ENTRE les lanes
                // IMPORTANT: Le Y de chaque élément est basé sur sa position réelle dans phase.tasks
                // - Tâche normale : Y = index entier (0, 1, 2, ...)
                // - Jalon : Y = index + offset pour être ENTRE les lanes (ex: 0.4, 0.6 pour deux jalons entre 0 et 1)

                let currentY = 0; // Compteur global pour le Y (entier pour tâches)
                let consecutiveMilestones = 0; // Compteur de jalons consécutifs

                phases.forEach((phase, phaseIndex) => {
                    // DEBUG: Afficher l'ordre des tâches pour chaque phase
                    console.log(`Phase ${phase.id} (${phase.name}):`, phase.tasks.map(t => t.id + (t.isMilestone ? ' (jalon)' : '')));

                    phase.tasks.forEach((task, taskIndex) => {
                        const start = new Date(task.startDate).getTime();

                        if (task.isMilestone || !task.endDate) {
                            // Jalon : positionner avec un offset négatif décalé par le nombre de jalons consécutifs
                            // Premier jalon: currentY - 0.5 (entre currentY-1 et currentY)
                            // Deuxième jalon: currentY - 0.4 (légèrement plus bas)
                            // Troisième jalon: currentY - 0.3, etc.
                            const yPosition = currentY - 0.5 + (consecutiveMilestones * 0.1);

                            milestones.push({
                                task: task,
                                phase: phase,
                                yPosition: yPosition, // Y non-entier pour être ENTRE les lanes
                                date: start
                            });

                            // Incrémenter le compteur de jalons consécutifs
                            consecutiveMilestones++;
                        } else {
                            // Tâche normale : ajouter à ganttData avec Y entier
                            const end = new Date(task.endDate).getTime();
                            ganttData.push({
                                x: [start, end],
                                y: currentY, // Y entier pour la lane de la tâche
                                isMilestone: false,
                                task: task
                            });
                            labels.push(`${task.id}. ${task.title}`);
                            colors.push(phase.color);

                            // Incrémenter currentY pour les tâches normales
                            currentY++;
                            // Réinitialiser le compteur de jalons consécutifs
                            consecutiveMilestones = 0;
                        }
                    });
                });
            } else if (ganttViewMode === 'consolide') {
                // Mode Consolidé : compactage par phase, labels de phase à gauche
                consolidatedLayout.forEach((layoutEntry) => {
                    const phase = layoutEntry.phase;
                    const startLine = layoutEntry.startLine;

                    layoutEntry.compactedLines.forEach((lineData, lineIndex) => {
                        const globalLineIndex = startLine + lineIndex;
                        labels.push(`Ligne ${globalLineIndex + 1}`);

                        lineData.line.forEach(task => {
                            const start = new Date(task.startDate).getTime();
                            const phaseColor = phase.color;

                            if (task.isMilestone || !task.endDate) {
                                const end = start + (2 * 24 * 60 * 60 * 1000);
                                ganttData.push({
                                    x: [start, end],
                                    y: globalLineIndex,
                                    isMilestone: true,
                                    compactMode: true,
                                    task: task,
                                    color: phaseColor
                                });
                            } else {
                                const end = new Date(task.endDate).getTime();
                                ganttData.push({
                                    x: [start, end],
                                    y: globalLineIndex,
                                    isMilestone: false,
                                    task: task,
                                    color: phaseColor
                                });
                            }
                            colors.push(phaseColor);
                        });
                    });
                });
            } else {
                // Mode Compact : minimiser les lignes, jalons intégrés aux lignes de tâches
                const allTasks = phases.flatMap(p => p.tasks);
                const compactedLines = compactTasksAndMilestones(allTasks);

                compactedLines.forEach((lineData, lineIndex) => {
                    const line = lineData.line;
                    
                    // Créer le label de la ligne
                    labels.push(`Ligne ${lineIndex + 1}`);

                    // Ajouter toutes les tâches/jalons de cette ligne
                    line.forEach(task => {
                        const start = new Date(task.startDate).getTime();
                        const phase = phases.find(p => p.tasks.some(t => t.id === task.id));
                        const phaseColor = phase ? phase.color : currentPalette[0];

                        if (task.isMilestone || !task.endDate) {
                            // Jalon
                            // On ajoute compactMode: true pour informer le plugin qu'il faut un offset Y
                            const end = start + (2 * 24 * 60 * 60 * 1000); 
                            ganttData.push({
                                x: [start, end],
                                y: lineIndex,
                                isMilestone: true,
                                compactMode: true,
                                task: task,
                                color: phaseColor // Pour le titre
                            });
                        } else {
                            // Tâche normale
                            const end = new Date(task.endDate).getTime();
                            ganttData.push({
                                x: [start, end],
                                y: lineIndex,
                                isMilestone: false,
                                task: task,
                                color: phaseColor // Pour le titre
                            });
                        }
                        colors.push(phaseColor);
                    });
                });
            }

            // Préparer les couleurs avec transparence pour le fond
            const backgroundColors = colors.map((color, index) => {
                // Vérifier si ganttData[index] existe et si c'est un jalon
                if (ganttData[index] && ganttData[index].isMilestone) {
                    return 'transparent'; // Jalons invisibles (rendu via plugin milestone uniquement)
                }
                // Convertir hex en rgba avec 30% d'opacité
                const r = parseInt(color.slice(1, 3), 16);
                const g = parseInt(color.slice(3, 5), 16);
                const b = parseInt(color.slice(5, 7), 16);
                return `rgba(${r}, ${g}, ${b}, 0.3)`;
            });

            // Créer le chart de type bar horizontal
            ganttChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Tâches',
                        data: ganttData,
                        backgroundColor: backgroundColors,
                        borderColor: colors.map((color, index) => ganttData[index].isMilestone ? 'transparent' : color),
                        borderWidth: 1,
                        borderSkipped: false,
                        barThickness: (ganttViewMode === 'compact' || ganttViewMode === 'consolide') ? 40 : 35,
                        categoryPercentage: (ganttViewMode === 'compact' || ganttViewMode === 'consolide') ? 0.4 : 0.65
                    }]
                },
                options: {
                    // Passer les données au plugin
                    ganttData: ganttData,
                    phasesData: phases,
                    milestonesData: milestones,
                    consolidatedPhaseLayout: consolidatedLayout || null,
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    layout: { padding: { left: (ganttViewMode === 'consolide') ? 180 : 60, right: 100, top: 30 } },
                    scales: {
                        x: {
                            min: minDate - 3 * dayMs,
                            max: maxDate + 3 * dayMs,
                            ticks: {
                                callback: function(value) {
                                    const date = new Date(value);
                                    // Format adapté à la langue
                                    if (currentLanguage === 'en') {
                                        // Anglais: MM/DD
                                        return `${date.getMonth() + 1}/${date.getDate()}`;
                                    } else {
                                        // Français (et autres): JJ/MM
                                        return `${date.getDate()}/${date.getMonth() + 1}`;
                                    }
                                }
                            },
                            title: {
                                display: false // Pas de titre pour l'axe X
                            }
                        },
                        y: (ganttViewMode === 'compact') ? {
                            type: 'linear',
                            beginAtZero: true,
                            min: -0.5,
                            max: numLines - 0.5,
                            reverse: true,
                            grid: { display: false },
                            title: { display: false },
                            ticks: {
                                stepSize: 1,
                                padding: 4,
                                callback: function(value) {
                                    if (Number.isInteger(value) && value >= 0 && value < numLines) {
                                        return 'Ligne ' + (value + 1);
                                    }
                                    return '';
                                }
                            }
                        } : (ganttViewMode === 'consolide') ? {
                            type: 'linear',
                            beginAtZero: true,
                            min: -0.5,
                            max: numLines - 0.5,
                            reverse: true,
                            grid: { display: false },
                            title: { display: false },
                            ticks: {
                                stepSize: 1,
                                padding: 4,
                                callback: function() { return ''; }
                            }
                        } : {
                            beginAtZero: true,
                            grid: { display: false },
                            title: { display: false },
                            ticks: { padding: 4 }
                        }
                    },
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            // Décalée du curseur, ne recouvre jamais la barre
                            // survolée (bascule de côté près des bords/coins)
                            position: 'plannrOffset',
                            caretSize: 0,
                            callbacks: {
                                label: function(context) {
                                    const dataIndex = context.dataIndex;
                                    const start = ganttData[dataIndex].x[0];
                                    const isMilestone = ganttData[dataIndex].isMilestone;
                                    // La tâche vient de ganttData : indexer
                                    // phases.flatMap décalait d'un cran par jalon
                                    // (les jalons sont exclus de ganttData en
                                    // cascade) -> mauvais contenu affiché
                                    const task = ganttData[dataIndex].task;

                                    if (!task) return '';

                                    const startDate = new Date(start).toLocaleDateString('fr-FR');

                                    if (task.isMilestone || isMilestone) {
                                        // Jalon : afficher seulement la date
                                        return [
                                            `◆ ${task.id}: ${task.title}`,
                                            `Date: ${startDate}`,
                                            `Statut: ${task.statut}`
                                        ];
                                    } else {
                                        // Tâche normale : afficher début, fin et durée
                                        const end = ganttData[dataIndex].x[1];
                                        const endDate = new Date(end).toLocaleDateString('fr-FR');
                                        const duration = workingDaysBetween(task.startDate, task.endDate);

                                        return [
                                            `${task.id}: ${task.title}`,
                                            `Du: ${startDate}`,
                                            `Au: ${endDate}`,
                                            `Durée: ${duration} j ouvrés`,
                                            `Statut: ${task.statut}`
                                        ];
                                    }
                                }
                            }
                        }
                    }
                }
            });

            // ===== EVENT LISTENERS POUR LE DRAG & DROP =====
            canvas.style.cursor = 'grab';

            // v2.1.3 : purger les listeners du build précédent. Ils
            // s'empilaient à chaque updateGantt ; après un changement de
            // vue, l'ANCIEN closure (indexé sur l'autre mode) interceptait
            // le mouseup et committait le drag sur la MAUVAISE tâche.
            if (canvas._plannrDragListeners) {
                for (const [evType, evFn] of canvas._plannrDragListeners) {
                    canvas.removeEventListener(evType, evFn);
                }
            }
            canvas._plannrDragListeners = [];
            const addGanttListener = (evType, evFn) => {
                canvas.addEventListener(evType, evFn);
                canvas._plannrDragListeners.push([evType, evFn]);
            };

            addGanttListener('mousedown', function(e) {
                const rect = canvas.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const clickY = e.clientY - rect.top;

                const xAxis = ganttChart.scales.x;
                const yAxis = ganttChart.scales.y;
                const labels = ganttChart.data.labels;
                
                let dataIndex; // Déclaration déplacée ici

                // Calculer la hauteur d'une ligne
                let laneHeight;
                if (ganttViewMode === 'cascade') {
                    const maxY = Math.max(...ganttData.map(d => d.y));
                    const numLanes = maxY + 1;
                    laneHeight = (yAxis.bottom - yAxis.top) / Math.max(1, numLanes);
                } else {
                    laneHeight = (yAxis.bottom - yAxis.top) / Math.max(1, labels.length - 1);
                }

                // D'abord, vérifier si le clic est sur une capsule de jalon
                let milestoneClickedTask = null;

                if (ganttViewMode === 'cascade') {
                    // Mode cascade : vérifier les jalons dans milestonesData
                    if (milestones && milestones.length > 0) {
                        milestones.forEach((milestone) => {
                            const x = xAxis.getPixelForValue(milestone.date);
                            // IMPORTANT: yPosition est déjà non-entier pour être ENTRE les lanes
                            const capsuleY = yAxis.getPixelForValue(milestone.yPosition);

                            const capsuleWidth = 50;
                            const capsuleHeight = 20;

                            const halfWidth = capsuleWidth / 2;
                            const halfHeight = capsuleHeight / 2;

                            if (clickX >= x - halfWidth && clickX <= x + halfWidth &&
                                clickY >= capsuleY - halfHeight && clickY <= capsuleY + halfHeight) {
                                milestoneClickedTask = milestone.task;
                            }
                        });
                    }
                } else {
                    // Modes groupe et compact : vérifier dans ganttData
                    ganttData.forEach((dataPoint, index) => {
                        if (dataPoint.isMilestone) {
                            const x = xAxis.getPixelForValue(dataPoint.x[0]);
                            let capsuleY = yAxis.getPixelForValue(dataPoint.y);

                            // Appliquer le décalage si mode compact
                            if (ganttViewMode === 'compact' && dataPoint.compactMode) {
                                capsuleY += 28;
                            }

                            const capsuleWidth = 50;
                            const capsuleHeight = 20;

                            const halfWidth = capsuleWidth / 2;
                            const halfHeight = capsuleHeight / 2;

                            if (clickX >= x - halfWidth && clickX <= x + halfWidth &&
                                clickY >= capsuleY - halfHeight && clickY <= capsuleY + halfHeight) {
                                // Mode Compact/Groupe : On traite le jalon comme une tâche normale via son index
                                // On ne définit PAS milestoneClickedTask pour éviter d'entrer dans la logique Cascade
                                dataIndex = index;
                                return; // Sortir de la boucle
                            }
                        }
                    });
                }

                // Vérifier d'abord si on clique sur un bord d'une tâche pour le redimensionnement
                if (!milestoneClickedTask && dataIndex === undefined) {
                    ganttData.forEach((dataPoint, index) => {
                        if (dataPoint.isMilestone) return; // Skip milestones

                        const xStart = xAxis.getPixelForValue(dataPoint.x[0]);
                        const xEnd = xAxis.getPixelForValue(dataPoint.x[1]);
                        const y = yAxis.getPixelForValue(dataPoint.y);
                        const barHeight = 35; // Hauteur fixe des barres (barThickness)

                        // Tolérance de 10 pixels pour le clic sur les bords
                        const edgeTolerance = 10;

                        // Vérifier si on est près du bord gauche ou droit
                        if (Math.abs(clickX - xStart) <= edgeTolerance &&
                            clickY >= y - barHeight/2 && clickY <= y + barHeight/2) {
                            // Bord gauche - redimensionner la date de début
                            resizeEdge = 'left';
                            resizeTaskIndex = index;
                            resizeStartDate = dataPoint.x[0];
                            resizeEndDate = dataPoint.x[1];
                            isResizing = true;
                            dragStartX = clickX; // Initialiser dragStartX pour éviter les bugs
                            return; // Sortir de la boucle
                        } else if (Math.abs(clickX - xEnd) <= edgeTolerance &&
                            clickY >= y - barHeight/2 && clickY <= y + barHeight/2) {
                            // Bord droit - redimensionner la date de fin
                            resizeEdge = 'right';
                            resizeTaskIndex = index;
                            resizeStartDate = dataPoint.x[0];
                            resizeEndDate = dataPoint.x[1];
                            isResizing = true;
                            dragStartX = clickX; // Initialiser dragStartX pour éviter les bugs
                            return; // Sortir de la boucle
                        }
                    });
                }

                if (isResizing) {
                    // Mode redimensionnement
                    canvas.style.cursor = resizeEdge === 'left' ? 'w-resize' : 'e-resize';
                    dragStartX = clickX;
                    return;
                }

                if (milestoneClickedTask !== null) {
                    // Clic sur une capsule de jalon - permettre le drag & drop
                    isDragging = true;
                    draggedMilestone = milestoneClickedTask;
                    dragStartDate = new Date(milestoneClickedTask.startDate).getTime();
                    dragStartX = clickX;

                    // Trouver les données du jalon dans milestones
                    draggedMilestoneData = milestones.find(m => m.task === milestoneClickedTask);

                    canvas.style.cursor = 'grabbing';

                    // Calculer les snap targets (sans exclusion de tâche pour les jalons)
                    const snapTargets = getSnapTargets(-1);

                    snapLines = snapTargets.map(target => ({
                        x: xAxis.getPixelForValue(target.date),
                        date: target.date,
                        type: target.type,
                        taskId: target.taskId
                    }));
                } else if (dataIndex === undefined) {
                    // Utiliser la détection Chart.js normale pour les tâches (seulement si pas déjà trouvé)
                    const elements = ganttChart.getElementsAtEventForMode(e, 'nearest', { intersect: true }, true);

                    if (elements.length > 0) {
                        dataIndex = elements[0].index;
                    } else {
                        // Fallback déterministe (v2.1.1) : hit-test manuel du corps
                        // des barres, même géométrie que la détection des bords
                        // ci-dessus. getElementsAtEventForMode s'avère non fiable
                        // immédiatement après un hover (retourne [] alors que la
                        // position relative est dans la barre).
                        ganttData.forEach((dataPoint, index) => {
                            if (dataIndex !== undefined || dataPoint.isMilestone) return;
                            const xStart = xAxis.getPixelForValue(dataPoint.x[0]);
                            const xEnd = xAxis.getPixelForValue(dataPoint.x[1]);
                            const y = yAxis.getPixelForValue(dataPoint.y);
                            const barHeight = 35;
                            if (clickX >= xStart && clickX <= xEnd &&
                                clickY >= y - barHeight / 2 && clickY <= y + barHeight / 2) {
                                dataIndex = index;
                            }
                        });
                    }
                }

                if (dataIndex !== undefined && dataIndex >= 0 && dataIndex < ganttData.length) {
                    isDragging = true;
                    draggedTaskIndex = dataIndex;
                    dragStartDate = ganttData[dataIndex].x[0];
                    dragStartX = clickX;

                    canvas.style.cursor = 'grabbing';

                    // Calculer les snap targets et leurs positions en pixels
                    const snapTargets = getSnapTargets(dataIndex);

                    snapLines = snapTargets.map(target => ({
                        x: xAxis.getPixelForValue(target.date),
                        date: target.date,
                        type: target.type,
                        taskId: target.taskId
                    }));

                }
            });

            addGanttListener('mousemove', function(e) {
                const rect = canvas.getBoundingClientRect();
                const mouseX = e.clientX - rect.left;
                const mouseY = e.clientY - rect.top;

                // Détection du survol des bords pour changer le curseur (si pas en mode drag/resize)
                if (!isDragging && !isResizing) {
                    const xAxis = ganttChart.scales.x;
                    const yAxis = ganttChart.scales.y;
                    let hoveringEdge = false;

                    ganttData.forEach((dataPoint, index) => {
                        if (dataPoint.isMilestone) return; // Skip milestones

                        const xStart = xAxis.getPixelForValue(dataPoint.x[0]);
                        const xEnd = xAxis.getPixelForValue(dataPoint.x[1]);
                        const y = yAxis.getPixelForValue(dataPoint.y);
                        const barHeight = 50;
                        const edgeTolerance = 10;

                        // Vérifier si on survole le bord gauche ou droit
                        if ((Math.abs(mouseX - xStart) <= edgeTolerance ||
                             Math.abs(mouseX - xEnd) <= edgeTolerance) &&
                            mouseY >= y - barHeight/2 && mouseY <= y + barHeight/2) {
                            hoveringEdge = true;
                            canvas.style.cursor = Math.abs(mouseX - xStart) <= edgeTolerance ? 'w-resize' : 'e-resize';
                        }
                    });

                    if (!hoveringEdge) {
                        canvas.style.cursor = 'grab';
                    }
                }

                // Mode redimensionnement
                if (isResizing) {
                    const xAxis = ganttChart.scales.x;

                    // Calculer le déplacement en pixels et le convertir en temps
                    const deltaX = mouseX - dragStartX;

                    // Utiliser la bonne référence selon le bord qu'on redimensionne
                    const refDate = resizeEdge === 'left' ? resizeStartDate : resizeEndDate;
                    const newPixel = xAxis.getPixelForValue(refDate) + deltaX;
                    const newDate = xAxis.getValueForPixel(newPixel);

                    let finalDate = newDate;

                    // Appliquer le magnétisme seulement si Shift n'est PAS enfoncé
                    if (!e.shiftKey) {
                        const snapTargets = getSnapTargets(resizeTaskIndex);
                        const snapped = findSnapDate(newDate, snapTargets);

                        if (snapped) {
                            finalDate = snapped.date;
                            snapLines = snapLines.filter(line => Math.abs(line.date - finalDate) < 86400000);
                        } else {
                            snapLines = [];
                        }
                    } else {
                        snapLines = [];
                    }

                    const task = ganttData[resizeTaskIndex].task;
                    if (!task) return;

                    if (resizeEdge === 'left') {
                        // Redimensionner la date de début (garder la date de fin fixe)
                        ganttData[resizeTaskIndex].x[0] = finalDate;
                    } else {
                        // Redimensionner la date de fin (garder la date de début fixe)
                        ganttData[resizeTaskIndex].x[1] = finalDate;
                    }

                    ganttChart.update('none');
                    return;
                }

                if (!isDragging) return;
                if (draggedMilestone && !draggedMilestoneData) return;
                if (!draggedMilestone && draggedTaskIndex === null) return;

                const xAxis = ganttChart.scales.x;

                // Calculer le déplacement en pixels et le convertir en temps
                const deltaX = mouseX - dragStartX;
                const dataStart = dragStartDate;
                const pixelStart = xAxis.getPixelForValue(dataStart);
                const newPixel = pixelStart + deltaX;
                const newDate = xAxis.getValueForPixel(newPixel);

                let finalDate = newDate;

                // Appliquer le magnétisme seulement si Shift n'est PAS enfoncé
                if (!e.shiftKey) {
                    const snapTargets = getSnapTargets(draggedMilestone ? -1 : draggedTaskIndex);
                    const snapped = findSnapDate(newDate, snapTargets);

                    if (snapped) {
                        finalDate = snapped.date;
                        // Afficher les lignes de snap
                        snapLines = snapLines.filter(line => Math.abs(line.date - finalDate) < 86400000); // ±1 jour
                    } else {
                        snapLines = [];
                    }
                } else {
                    snapLines = [];
                }

                if (draggedMilestone && draggedMilestoneData) {
                    // Drag d'un jalon (tous modes)
                    draggedMilestoneData.date = finalDate;
                    
                    // En mode compact/groupe, mettre aussi à jour ganttData pour le retour visuel
                    if (draggedTaskIndex !== null) {
                        ganttData[draggedTaskIndex].x[0] = finalDate;
                        ganttData[draggedTaskIndex].x[1] = finalDate + (2 * 24 * 60 * 60 * 1000);
                    }
                } else if (draggedTaskIndex !== null) {
                    const task = ganttData[draggedTaskIndex] ? ganttData[draggedTaskIndex].task : null;
                    if (!task) return;

                    const isMilestone = task.isMilestone || ganttData[draggedTaskIndex].isMilestone;

                    if (isMilestone) {
                        // Pour un jalon : déplacer la barre de 2 jours (zone de clic)
                        ganttData[draggedTaskIndex].x[0] = finalDate;
                        ganttData[draggedTaskIndex].x[1] = finalDate + (2 * 24 * 60 * 60 * 1000); // 2 jours pour la zone de clic
                    } else {
                        // Pour une tâche normale : déplacer en conservant l'étendue
                        // CALENDAIRE réelle. NE PAS reconstruire via task.duration :
                        // depuis la v2.1 c'est une durée en jours OUVRÉS, l'utiliser
                        // comme delta calendaire faisait rétrécir la tâche au drag.
                        const spanMs = Math.max(0,
                            new Date(task.endDate) - new Date(task.startDate));
                        ganttData[draggedTaskIndex].x[0] = finalDate;
                        ganttData[draggedTaskIndex].x[1] = finalDate + spanMs;
                    }
                }

                ganttChart.update('none'); // Update sans animation pour la fluidité
            });

            addGanttListener('mouseup', function(e) {
                // Gestion de la fin du redimensionnement
                if (isResizing) {
                    const task = ganttData[resizeTaskIndex].task;
                    if (!task) return;

                    // Sauvegarder l'état avant modification
                    saveState();

                    // Mettre à jour les dates de la tâche
                    const newStart = new Date(ganttData[resizeTaskIndex].x[0]);
                    const newEnd = new Date(ganttData[resizeTaskIndex].x[1]);

                    task.startDate = newStart.toISOString().split('T')[0];
                    task.endDate = newEnd.toISOString().split('T')[0];
                    task.duration = workingDaysBetween(task.startDate, task.endDate);

                    // Recalculer les dates de la phase
                    const phase = phases.find(p => p.tasks.some(t => t.id === task.id));
                    if (phase) {
                        updatePhaseDates(phase);
                    }

                    // Réinitialiser
                    isResizing = false;
                    resizeEdge = null;
                    resizeTaskIndex = null;
                    resizeStartDate = null;
                    resizeEndDate = null;
                    snapLines = [];
                    canvas.style.cursor = 'grab';

                    // Cascade des dépendances + chemin critique (v2.1)
                    const shiftedByDeps = applyDependencyCascade({});
                    recomputeCriticalPath();

                    // Re-rendre tout (rebuild complet si la cascade a décalé
                    // d'autres tâches : leurs barres doivent être repositionnées)
                    if (shiftedByDeps > 0) updateGantt(); else ganttChart.update('none');
                    renderPlanning();
                    updateDashboard();

                    showToast('✅ Tâche redimensionnée');
                    return;
                }

                // Gestion de la fin du drag & drop
                if (!isDragging) return;
                if (draggedMilestone && !draggedMilestoneData) return;
                if (!draggedMilestone && draggedTaskIndex === null) return;

                if (draggedMilestone && draggedMilestoneData) {
                    // Fin du drag d'un jalon (tous modes)
                    saveState();

                    // Date d'origine (pour Alt+glisser : delta du sous-arbre)
                    const prevMilestoneStart = draggedMilestone.startDate;

                    // Mettre à jour la date du jalon
                    const newStart = new Date(draggedMilestoneData.date);
                    draggedMilestone.startDate = newStart.toISOString().split('T')[0];
                    // Pour un jalon, endDate = startDate
                    draggedMilestone.endDate = draggedMilestone.startDate;

                    // Recalculer les dates de la phase
                    const phase = phases.find(p => p.id === parseInt(draggedMilestone.id.split('.')[0]));
                    if (phase) {
                        updatePhaseDates(phase);
                    }

                    // Réinitialiser
                    isDragging = false;
                    draggedMilestone = null;
                    draggedMilestoneData = null;
                    draggedTaskIndex = null;
                    snapLines = [];
                    canvas.style.cursor = 'grab';

                    // Alt+glisser (v2.1.2) : déplacement RIGIDE du sous-arbre
                    let subtreeShifted = 0;
                    const dragDeltaDays = prevMilestoneStart ? Math.round(
                        (new Date(draggedMilestone.startDate + 'T12:00:00Z') -
                         new Date(prevMilestoneStart + 'T12:00:00Z')) / 86400000) : 0;
                    if (e.altKey && dragDeltaDays !== 0) {
                        subtreeShifted = shiftDescendants(draggedMilestone, dragDeltaDays);
                    }

                    // Cascade des dépendances + chemin critique (v2.1)
                    const shiftedByDeps = applyDependencyCascade({});
                    recomputeCriticalPath();

                    // Re-rendre tout
                    sanitizeData();
                    if (shiftedByDeps > 0 || subtreeShifted > 0) updateGantt();
                    else ganttChart.update('none');
                    renderPlanning();
                    updateDashboard();

                    showToast('✅ Jalon déplacé');
                    if (subtreeShifted > 0) {
                        showToast(t('subtreeShifted').replace('{n}', subtreeShifted));
                    } else if (dragDeltaDays < 0 && collectDescendants(draggedMilestone.id).size > 0) {
                        showToast(t('altDragHint'));
                    }
                } else {
                    // Fin du drag d'une tâche normale
                    if (!ganttData[draggedTaskIndex]) return; // Sécurité supplémentaire
                    const task = ganttData[draggedTaskIndex].task;
                    if (!task) return;

                    const newStart = new Date(ganttData[draggedTaskIndex].x[0]);
                    const isMilestone = task.isMilestone || ganttData[draggedTaskIndex].isMilestone;

                    // Sauvegarder l'état avant modification
                    saveState();

                    // Date d'origine (pour Alt+glisser : delta du sous-arbre)
                    const prevStartDate = task.startDate;

                    // Mettre à jour la tâche/jalon
                    task.startDate = newStart.toISOString().split('T')[0];

                    if (isMilestone) {
                        // Pour un jalon : date fin = date début
                        task.endDate = task.startDate;
                    } else {
                        // Tâche normale
                        const newEnd = new Date(ganttData[draggedTaskIndex].x[1]);
                        task.endDate = newEnd.toISOString().split('T')[0];
                        task.duration = workingDaysBetween(task.startDate, task.endDate);
                    }

                    // Recalculer les dates de la phase
                    const phase = phases.find(p => p.tasks.some(t => t.id === task.id));
                    if (phase) {
                        updatePhaseDates(phase);
                    }

                    // Réinitialiser
                    isDragging = false;
                    draggedTaskIndex = null;
                    snapLines = [];
                    canvas.style.cursor = 'grab';

                    // Alt+glisser (v2.1.2) : déplacement RIGIDE du sous-arbre —
                    // toute la descendance suit du même delta, dans les 2 sens
                    let subtreeShifted = 0;
                    const dragDeltaDays = prevStartDate ? Math.round(
                        (new Date(task.startDate + 'T12:00:00Z') -
                         new Date(prevStartDate + 'T12:00:00Z')) / 86400000) : 0;
                    if (e.altKey && dragDeltaDays !== 0) {
                        subtreeShifted = shiftDescendants(task, dragDeltaDays);
                    }

                    // Cascade des dépendances + chemin critique (v2.1)
                    const shiftedByDeps = applyDependencyCascade({});
                    recomputeCriticalPath();

                    // Re-rendre tout
                    sanitizeData();
                    if (shiftedByDeps > 0 || subtreeShifted > 0) updateGantt();
                    else ganttChart.update('none');
                    renderPlanning();
                    updateDashboard();

                    const itemType = isMilestone ? 'Jalon' : 'Tâche';
                    showToast(`✅ ${itemType} déplacé(e)`);
                    if (subtreeShifted > 0) {
                        showToast(t('subtreeShifted').replace('{n}', subtreeShifted));
                    } else if (dragDeltaDays < 0 && collectDescendants(task.id).size > 0) {
                        // Découvrabilité : recul d'une tâche qui a des successeurs
                        showToast(t('altDragHint'));
                    }
                }
            });

            addGanttListener('mouseleave', function() {
                if (isDragging) {
                    isDragging = false;
                    draggedTaskIndex = null;
                    draggedMilestone = null;
                    draggedMilestoneData = null;
                    snapLines = [];
                    canvas.style.cursor = 'grab';
                    ganttChart.update('none');
                }

                // Réinitialiser le redimensionnement si on quitte le canvas
                if (isResizing) {
                    isResizing = false;
                    resizeEdge = null;
                    resizeTaskIndex = null;
                    resizeStartDate = null;
                    resizeEndDate = null;
                    snapLines = [];
                    canvas.style.cursor = 'grab';
                    ganttChart.update('none');
                }
            });
        }

        // ========================================
        // Mise à jour du Dashboard
        // ========================================
        function updateDashboard(currentRisks) {
            // Récupérer toutes les tâches depuis les phases
            const allTasks = riskGroups.flatMap(p => p.tasks);

            // Vérifier que les éléments existent avant de les mettre à jour
            const totalEl = document.getElementById('dashboard-total-tasks');
            const inProgressEl = document.getElementById('dashboard-in-progress');
            const completedEl = document.getElementById('dashboard-completed');
            const durationEl = document.getElementById('dashboard-total-duration');
            const progressionEl = document.getElementById('dashboard-progression');

            if (!totalEl || !inProgressEl || !completedEl || !durationEl || !progressionEl) {
                return; // Un des éléments n'existe pas
            }

            // 1. Nombre total de tâches
            totalEl.textContent = allTasks.length;

            // 2. Tâches en cours
            const inProgressTasks = allTasks.filter(task => {
                return task.statut === 'statusInProgress' || task.statut === 'En cours';
            }).length;
            inProgressEl.textContent = inProgressTasks;

            // 3. Tâches terminées
            const completedTasks = allTasks.filter(task => {
                return task.statut === 'statusDone' || task.statut === 'statusTreated' || task.statut === 'Terminé';
            }).length;
            completedEl.textContent = completedTasks;

            // 4. Durée totale du projet (somme des durées OUVRÉES, jalons exclus)
            const totalDuration = allTasks.reduce((sum, task) => sum +
                (task.isMilestone ? 0 : workingDaysBetween(task.startDate, task.endDate || task.startDate)), 0);
            durationEl.textContent = `${totalDuration} j`;

            // 5. Tâches en retard (échéance dépassée, non terminées)
            const overdueEl = document.getElementById('dashboard-overdue');
            if (overdueEl) {
                const overdueCount = allTasks.filter(isTaskOverdue).length;
                overdueEl.textContent = overdueCount;
                overdueEl.style.color = overdueCount > 0 ? '#FF3B30' : '#1A6A3E';
            }

            // 6. Progression PONDÉRÉE par la durée ouvrée (jalons exclus) —
            // une tâche de 30 j pèse 30x plus qu'une tâche de 1 j
            const weightedTasks = allTasks.filter(task => !task.isMilestone);
            let wSum = 0, wTotal = 0;
            weightedTasks.forEach(task => {
                const w = Math.max(1, workingDaysBetween(task.startDate, task.endDate || task.startDate));
                wTotal += w;
                wSum += w * effectiveProgress(task);
            });
            const completionRate = wTotal > 0 ? Math.round(wSum / wTotal) : 0;
            progressionEl.textContent = `${completionRate}%`;

            // Colorer selon le taux de complétion
            if (completionRate >= 75) {
                progressionEl.style.color = '#1A6A3E'; // Vert
            } else if (completionRate >= 50) {
                progressionEl.style.color = '#FF9500'; // Orange
            } else {
                progressionEl.style.color = '#666666'; // Gris
            }
        }

        // ========================================
        // Fonctions pour ajouter des groupes et des risques
        // ========================================

        window.addNewRiskToGroup = function(groupId) {
            const group = riskGroups.find(g => g.id == groupId);
            if (!group) {
                console.error(`❌ Groupe ${groupId} introuvable`);
                return;
            }

            // Créer un nouveau risque avec un ID unique
            const groupPrefix = `${groupId}.`;
            const maxNum = risks
                .filter(r => r.id.startsWith(groupPrefix))
                .map(r => parseInt(r.id.split('.')[1]))
                .reduce((max, num) => Math.max(max, num), 0);

            const newRiskId = `${groupId}.${maxNum + 1}`;

            // Créer le nouveau risque
            const newRisk = {
                id: newRiskId,
                title: "Nouveau risque",
                dtuBefore: [2, 2],
                dtuAfter: [1, 1],
                gcBefore: [2, 2],
                gcAfter: [1, 1],
                mesures: ["Remédiation à définir"]
            };

            // Ajouter au tableau global
            risks.push(newRisk);

            // Ajouter au groupe
            group.tasks.push(newRisk);


            // Re-render
            renderPlanning();
            updateDashboard();
            initGroupNameEditing();
            initGroupDescriptionEditing();
            initRiskTitleEditing();
            initRemediationEditing();
            initStatusDropdowns();
                initResponsableEditing();
            initSectionTitleEditing();
            updateGantt();
        }

        // ========================================
        // Modal d'agrandissement des matrices
        // ========================================

        // Les fonctions de gestion de la modal matricielle ont été supprimées car elles sont obsolètes pour le planning.
        function openMatrixModal(type) {}
        function closeMatrixModal(event) {}
        function navigateMatrix(direction) {}


        // ========================================
        // Fonction pour changer de langue
        // ========================================

        function setLanguage(lang) {
            currentLanguage = lang;
            appStorage.setItem('riskr-language', lang);

            // Mettre à jour le sélecteur
            document.getElementById('language-selector').value = lang;

            // Mettre à jour tous les éléments avec data-i18n
            document.querySelectorAll('[data-i18n]').forEach(el => {
                const key = el.getAttribute('data-i18n');
                el.textContent = t(key);
            });

            // Re-render les risques pour mettre à jour les dropdowns traduits
            renderPlanning();
            initGroupNameEditing();
            initGroupDescriptionEditing();
            initRiskTitleEditing();
            initRemediationEditing();
            initStatusDropdowns();
            initResponsableEditing();
            initSectionTitleEditing();
            updateGantt();
        }

        function initLanguage() {
            const savedLang = appStorage.getItem('riskr-language') || 'fr';
            currentLanguage = savedLang;
            document.getElementById('language-selector').value = savedLang;
        }

        // Les fonctions de vue matricielle ont été supprimées.

        // Nettoyer les données (doublons, cohérence, dates invalides)
        function sanitizeData() {
            const seenIds = new Set();
            riskGroups.forEach(group => {
                group.tasks = group.tasks.filter(task => {
                    // 1. Vérifier doublons ID
                    if (seenIds.has(task.id)) {
                        console.warn(`Doublon supprimé: ${task.id}`);
                        return false;
                    }
                    seenIds.add(task.id);

                    // 2. Vérifier dates
                    if (!task.startDate) return false; // Pas de date de début = poubelle
                    
                    const start = new Date(task.startDate).getTime();
                    const end = task.endDate ? new Date(task.endDate).getTime() : start;

                    if (isNaN(start) || (task.endDate && isNaN(end))) {
                        console.warn(`Dates invalides pour ${task.id}`);
                        return false;
                    }

                    if (end < start) {
                        console.warn(`Fin avant début pour ${task.id}, correction automatique`);
                        task.endDate = task.startDate; // Correction
                    }

                    // Normalisation des champs v2.1
                    if (task.dependsOn && !Array.isArray(task.dependsOn)) delete task.dependsOn;
                    if (task.progress !== undefined) {
                        const p = parseInt(task.progress, 10);
                        if (Number.isFinite(p)) task.progress = Math.min(100, Math.max(0, p));
                        else delete task.progress;
                    }

                    return true;
                });
            });
            
            // Reconstruire le tableau plat
            risks.length = 0;
            riskGroups.forEach(g => risks.push(...g.tasks));

            // Purger les références de dépendances orphelines (v2.1)
            const validIds = new Set(risks.map(r => r.id));
            risks.forEach(r => {
                if (Array.isArray(r.dependsOn)) {
                    r.dependsOn = r.dependsOn.filter(id => validIds.has(id));
                    if (r.dependsOn.length === 0) delete r.dependsOn;
                }
            });
        }

        // Initialisation
        sanitizeData(); // Nettoyage préventif
        loadBaseline(); // Baseline v2.1 (PLANNR_DATA.baseline ou stockage local)
        applyDependencyCascade({ silent: true }); // Contraintes de dépendances
        recomputeCriticalPath(); // Chemin critique (Gantt)
        initLanguage(); // Initialiser la langue sauvegardée
        initGanttView(); // Restaurer la vue Gantt sauvegardée
        restoreGroupMappingFromStorage(); // Restaurer le mapping depuis localStorage (une seule fois)
        renderPlanning();
        initGroupNameEditing(); // Activer l'édition inline sur les noms de groupes
        initGroupDescriptionEditing(); // Activer l'édition inline sur les descriptions de groupes
        initRiskTitleEditing(); // Activer l'édition inline sur les noms de risques
        initRemediationEditing(); // Activer l'édition inline sur les remédiations
        initStatusDropdowns();
        initResponsableEditing(); // Activer les dropdowns de statut
        initSectionTitleEditing(); // Activer l'édition inline sur les sous-titres de sections
        updateGantt();
        updateDashboard();

        // Sauvegarder l'état initial pour le système undo/redo
        saveState();
    