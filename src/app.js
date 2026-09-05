
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
                if (documentReady && /^(risk-|group-|analysis-|plannr-saturday-worked|plannr-baseline)/.test(key)) return null;
                try { const v = localStorage.getItem(LS_PREFIX + key);
                return v !== null ? v : localStorage.getItem(key); } catch (err) { storageFailure = err.message; return null; }
            },
            setItem(key, value) { try { localStorage.setItem(LS_PREFIX + key, value); } catch (err) { storageFailure = err.message; } saveState(); },
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
                            showToast('Modification sauvegardée');
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
                        element.textContent = element.dataset.originalValue ?? element.textContent;
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
            btn.innerHTML = uiIcon(active ? 'edit' : 'presentation');
            btn.dataset.uiLabel = active ? 'edit' : 'presentation';
            btn.title = uiText(btn.dataset.uiLabel); btn.setAttribute('aria-label', btn.title);
            btn.setAttribute('aria-pressed', String(active));
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
                            showToast('Modification sauvegardée');
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
                        element.textContent = element.dataset.originalValue ?? element.textContent;
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
                            showToast('Modification sauvegardée');
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
                        element.textContent = element.dataset.originalValue ?? element.textContent;
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
                            showToast('Modification sauvegardée');
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
                        element.textContent = element.dataset.originalValue ?? element.textContent;
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
                            showToast('Modification sauvegardée');
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
                        element.textContent = element.dataset.originalValue ?? element.textContent;
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
                    if (isTaskDone(risk)) risk.progress = 100;
                    else if (risk.progress === 100) risk.progress = 0;
                    updateDashboard(); updateGantt(); renderPlanning();

                    showToast('Statut mis à jour');
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
                        risk.assignedTo = savedValue;
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
                            risk.assignedTo = '';
                        }
                    } else {
                        appStorage.setItem(storageKey, newValue);
                        const risk = risks.find(r => r.id === riskId);
                        if (risk) {
                            risk.assignedTo = newValue;
                        }

                        // N'afficher le toast que si la valeur a changé
                        if (newValue !== originalValue) {
                            showToast('Modification sauvegardée');
                        }
                    }
                    refreshFilterOptions(); updateGantt(); updateDashboard(); decoratePlanning();
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
                            showToast('Modification sauvegardée');
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
                        element.textContent = element.dataset.originalValue ?? element.textContent;
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
                    if (!validISODate(newValue)) { this.value = task[dateType]; return; }
                    if (dateType === 'startDate') moveTaskToWorkingDate(task, newValue);
                    else if (newValue < task.startDate) { this.value = task.endDate; return; }
                    else task.endDate = newValue;

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
                    renderPlanning();

                    // Mettre à jour le Gantt
                    updateGantt();
                    updateDashboard();

                });
            });
        }

        // ========================================
        // Fonction d'export vers fichier HTML
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
                version: "2.3",
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
                baseline: baselineData || undefined,
                // Calendrier métier (v2.2) : omis si tout est aux défauts
                calendar: (function () {
                    const source = (window.PLANNR_DATA && window.PLANNR_DATA.calendar) || {};
                    const cal = {
                        saturdayWorked: calendarConfig.saturdayWorked,
                        extraHolidays: Array.from(calendarConfig.extraHolidays),
                        skippedHolidays: Array.from(calendarConfig.skippedHolidays)
                    };
                    const meaningful = cal.saturdayWorked || cal.extraHolidays.length ||
                        cal.skippedHolidays.length || source.saturdayWorked !== undefined;
                    return meaningful ? cal : undefined;
                })()
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
            downloadTextFile(buildDataJsContent(), 'plannr-data.js', 'text/javascript');
            if (typeof showToast === 'function') showToast('plannr-data.js généré');
        }

        // ========================================
        // Import Données JSON
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
            return (translations[currentLanguage] || translations.fr)[key] || translations.fr[key] || key;
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
                `<option value="${item.value}" ${item.value === selectedValue ? 'selected' : ''} style="background-color: ${item.color};">${item.label}</option>`
            ).join('');
        }

        // Helper pour générer les options de statut
        function generateStatusOptions(selectedStatus) {
            const statusOptions = getStatusOptions();

            return statusOptions.map(item =>
                `<option value="${item.value}" ${item.value === selectedStatus ? 'selected' : ''}>${item.label}</option>`
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
        // ========================================
        // CHARGEMENT DES DONNÉES
        // ========================================
        let tasks, phases;

        const _extPhases = window.PLANNR_DATA &&
            (window.PLANNR_DATA.phases || window.PLANNR_DATA.riskGroups);
        if (_extPhases) {
            const extData = window.PLANNR_DATA;
            phases = JSON.parse(JSON.stringify(_extPhases));
            tasks = [];
            phases.forEach(group => {
                if (group.tasks && Array.isArray(group.tasks)) {
                    group.tasks.forEach(t => tasks.push(t));
                }
            });

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
            trigger.className = 'dropdown-trigger icon-button';
            trigger.dataset.uiLabel = 'palette';
            trigger.title = uiText('palette'); trigger.setAttribute('aria-label', trigger.title);
            trigger.onclick = togglePaletteDropdown;
            trigger.innerHTML = uiIcon('palette');

            // Créer le menu avec styles inline
            const menu = document.createElement('div');
            menu.id = 'palette-dropdown-menu';
            menu.className = 'dropdown-menu';
            menu.style.cssText = 'display: none; position: absolute; top: 100%; left: 0; margin-top: 4px; background: var(--surface); border: 1px solid var(--line); border-radius: 8px; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15); max-height: 400px; overflow-y: auto; z-index: 1000; min-width: 300px;';

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
                nameSpan.style.cssText = 'font-size: 13px; font-weight: 500; color: var(--ink); flex: 1; white-space: nowrap;';
                nameSpan.textContent = palette.name;

                item.appendChild(colorsPreview);
                item.appendChild(nameSpan);

                item.addEventListener('click', () => {
                    setColorPalette(index);
                    togglePaletteDropdown();
                });

                item.addEventListener('mouseenter', () => {
                    item.style.background = 'var(--surface-soft)';
                });
                item.addEventListener('mouseleave', () => {
                    item.style.background = 'var(--surface)';
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
            if (savedPalette !== null && colorPalettes[savedPalette]) {
                currentPalette = colorPalettes[savedPalette].colors;
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
            const trigger = document.querySelector('.dropdown-trigger');
            if (trigger) {
                trigger.title = uiText('palette') + ' · ' + name;
                trigger.setAttribute('aria-label', trigger.title);
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

            showToast(`Palette "${palette.name}" appliquée`);
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
            const group = riskGroups.find(g => g.id === groupId);
            if (!group || !confirm('Supprimer la phase « ' + group.name + ' » et ses tâches ?')) return;
            commitDocument();
            riskGroups.splice(riskGroups.indexOf(group), 1);
            sanitizeData(); refreshDocumentViews(); commitDocument();
        }

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
            const group = riskGroups.find(g => g.tasks.some(t => t.id === riskId));
            if (!group || !confirm('Supprimer cette tâche ?')) return;
            commitDocument();
            group.tasks.splice(group.tasks.findIndex(t => t.id === riskId), 1);
            sanitizeData(); refreshDocumentViews(); commitDocument();
        }

        function addNewRiskAtPosition(groupId, position, isMilestone = false, customDate = null) {
            const group = riskGroups.find(g => g.id === groupId); if (!group) return;
            commitDocument();
            const ids = new Set(risks.map(t => t.id));
            let number = 1; while (ids.has(groupId + '.' + number)) number++;
            const start = customDate || group.tasks[Math.max(0, position - 1)]?.startDate || todayISO();
            const task = { id: groupId + '.' + number, title: isMilestone ? 'Nouveau jalon' : 'Nouvelle tâche', startDate: isMilestone ? start : nextWorkingDate(start), isMilestone, assignedTo: '', statut: 'statusNotTreated', progress: 0 };
            task.endDate = isMilestone ? task.startDate : addWorkingDays(task.startDate, 4);
            group.tasks.splice(position, 0, task);
            risks.splice(0, risks.length, ...riskGroups.flatMap(g => g.tasks));
            refreshDocumentViews(); commitDocument();
        }

        function addNewGroupAtPosition(position) {
            commitDocument();
            const id = Math.max(0, ...riskGroups.map(g => g.id)) + 1;
            const start = nextWorkingDate(todayISO());
            riskGroups.splice(position, 0, {id, name: 'Nouvelle phase', description: '', color: currentPalette[(id - 1) % currentPalette.length], tasks: [{id: id + '.1', title: 'Nouvelle tâche', startDate: start, endDate: addWorkingDays(start, 4), statut: 'statusNotTreated', progress: 0}]});
            risks.splice(0, risks.length, ...riskGroups.flatMap(g => g.tasks));
            refreshDocumentViews(); commitDocument();
        }

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
            saveState();
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
                        <div class="risk-group-title editable-group-name" id="group-name-${group.id}" data-group-id="${group.id}">${escapeHtml(group.name)}</div>
                        <div class="risk-group-description editable-group-description" id="group-desc-${group.id}" data-group-id="${group.id}">${escapeHtml(group.description)}</div>
                    </div>
                `;

                // Ajouter le bouton de suppression
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'delete-btn';
                deleteBtn.innerHTML = uiIcon('trash') + '<span>' + t('deleteGroup') + '</span>';
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
                                <span class="editable-risk-title" data-risk-id="${risk.id}">${risk.id}. ${escapeHtml(risk.title)}</span>${inconsistencyBadgeHTML(risk)}${deadlineBadgeHTML(risk)}${notesIconHTML(risk)}${linkIconHTML(risk)}
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
                                <span class="editable-responsable" data-risk-id="${risk.id}">${escapeHtml(risk.assignedTo || risk.responsable || '') || t('clickToAdd')}</span>
                            </td>
                            ${renderDependsCellHTML(risk)}
                            <td style="text-align: center; padding: 4px;">
                                <button class="delete-btn delete-risk-btn" onclick="deleteRisk('${risk.id}')" title="Supprimer cette tâche" aria-label="Supprimer cette tâche">${uiIcon('trash')}</button>
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
            initNotesEditing(); // Édition des notes
            decoratePlanning();
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
        function updateDashboard(currentRisks) {
            saveState();
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

            // v2.2 : vues dérivées rafraîchies avec chaque refresh du dashboard
            renderWorkload();
            renderValidationBanner();
        }

        // ========================================
        // Fonctions pour ajouter des groupes et des risques
        // ========================================

        function setLanguage(lang) {
            currentLanguage = Object.hasOwn(translations, lang) ? lang : 'fr';
            appStorage.setItem('riskr-language', lang);

            // Mettre à jour le sélecteur
            document.getElementById('language-selector').value = currentLanguage;
            if (workspaceReady) refreshWorkspaceLabels();

            // Mettre à jour tous les éléments avec data-i18n
            document.querySelectorAll('[data-i18n]').forEach(el => {
                if (el.id === 'main-title' || el.id === 'main-subtitle') return;
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
            const savedLang = currentLanguage;
            currentLanguage = savedLang;
            document.getElementById('language-selector').value = savedLang;
        }

        // Les fonctions de vue matricielle ont été supprimées.

        // Nettoyer les données (doublons, cohérence, dates invalides)
        function sanitizeData() {
            dataAnomalies.length = 0; // FR-1 : collecte pour le bandeau
            const seenIds = new Set();
            riskGroups.forEach(group => {
                group.tasks = group.tasks.filter(task => {
                    // 1. Vérifier doublons ID
                    if (seenIds.has(task.id)) {
                        console.warn(`Doublon supprimé: ${task.id}`);
                        pushAnomaly('Tâche ' + task.id + ' en double — occurrence supprimée');
                        return false;
                    }
                    seenIds.add(task.id);

                    // 2. Vérifier dates
                    if (!task.startDate) {
                        pushAnomaly('Tâche ' + (task.id || '?') + ' sans date de début — supprimée');
                        return false;
                    }

                    const start = new Date(task.startDate).getTime();
                    const end = task.endDate ? new Date(task.endDate).getTime() : start;

                    if (isNaN(start) || (task.endDate && isNaN(end))) {
                        console.warn(`Dates invalides pour ${task.id}`);
                        pushAnomaly('Tâche ' + task.id + ' : dates invalides — supprimée');
                        return false;
                    }

                    if (end < start) {
                        console.warn(`Fin avant début pour ${task.id}, correction automatique`);
                        pushAnomaly('Tâche ' + task.id + ' : fin avant début — fin recalée au début');
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
                    const before = r.dependsOn.length;
                    // v2.2 : valider sur l'ID seul (les entrées peuvent porter
                    // un lag "id+N")
                    r.dependsOn = r.dependsOn.filter(entry =>
                        validIds.has(String(entry).split('+')[0].trim()));
                    if (r.dependsOn.length < before) {
                        pushAnomaly('Tâche ' + r.id + ' : ' + (before - r.dependsOn.length) +
                            ' dépendance(s) vers des tâches inconnues — ignorée(s)');
                    }
                    if (r.dependsOn.length === 0) delete r.dependsOn;
                }
                // v2.2 : champs optionnels normalisés
                if (r.deadline && isNaN(new Date(r.deadline).getTime())) {
                    pushAnomaly('Tâche ' + r.id + ' : date butoir invalide — ignorée');
                    delete r.deadline;
                }
                if (r.link && !/^https?:\/\//i.test(String(r.link))) {
                    pushAnomaly('Tâche ' + r.id + ' : lien non http(s) — ignoré');
                    delete r.link;
                }
            });
        }

        // Initialisation
        initTheme();
        prepareDocument();
        initCalendarConfig(); // v2.2 : calendrier MÉTIER avant tout calcul de durées
        sanitizeData(); // Nettoyage préventif
        loadBaseline(); // Baseline v2.1 (PLANNR_DATA.baseline ou stockage local)
        initShadingPrefs(); // Barres de neutralisation : préférences d'affichage
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
        computeDataChangeJournal(); // v2.2 : diff vs chargement précédent (FR-10)
        initGanttZoom(); // v2.2 : fenêtre temporelle persistée (FR-5)
        renderValidationBanner(); // re-rendu : inclut le journal calculé ci-dessus

        // Sauvegarder l'état initial pour le système undo/redo
        saveState();

        document.addEventListener("DOMContentLoaded", initWorkspace);
