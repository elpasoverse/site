/**
 * El Paso Verse - Land Target Inline Voting
 * Requires: firebase-config.js, auth.js, sheet-logger.js
 *
 * Usage: Set data-target on #votePanel, e.g. <div id="votePanel" data-target="rio-texaco">
 */

(function() {
    var targetId = document.getElementById('votePanel').getAttribute('data-target');
    var targetNames = {
        'verse-hotel': '"Verse Hotel" Almeria',
        'western-leone': 'Western Leone',
        'rio-texaco': 'Rio Texaco'
    };

    function updateVoteUI(totalVotes, hasVoted) {
        var countEl = document.getElementById('voteCount');
        var btnEl = document.getElementById('voteBtn');
        var statusEl = document.getElementById('voteStatus');
        if (!countEl || !btnEl) return;

        var count = totalVotes || 0;
        countEl.textContent = count + ' vote' + (count !== 1 ? 's' : '');

        if (hasVoted) {
            btnEl.textContent = 'Voted \u2713';
            btnEl.classList.add('voted');
            btnEl.disabled = true;
            if (statusEl) statusEl.textContent = '';
        } else {
            btnEl.textContent = 'Vote for This Target';
            btnEl.classList.remove('voted');
            btnEl.disabled = false;
        }
    }

    function showLoginState() {
        var btnEl = document.getElementById('voteBtn');
        var statusEl = document.getElementById('voteStatus');
        if (btnEl) {
            btnEl.textContent = 'Log In to Vote';
            btnEl.classList.add('needs-login');
            btnEl.disabled = false;
        }
        if (statusEl) {
            statusEl.innerHTML = 'You need a <a href="members.html" style="color: #C9A961;">member account</a> to vote.';
        }
    }

    function loadVotes() {
        if (!db) return;

        var user = (auth && auth.currentUser) ? auth.currentUser : null;

        db.collection('landVotes').doc('totals').get().then(function(doc) {
            var votes = doc.exists ? doc.data() : {};
            var totalVotes = votes[targetId] || 0;

            if (user) {
                db.collection('landVotes').doc(user.uid).get().then(function(userDoc) {
                    var userVotes = (userDoc.exists && userDoc.data().votes) ? userDoc.data().votes : [];
                    var hasVoted = userVotes.indexOf(targetId) !== -1;
                    updateVoteUI(totalVotes, hasVoted);
                }).catch(function() {
                    updateVoteUI(totalVotes, false);
                });
            } else {
                updateVoteUI(totalVotes, false);
                showLoginState();
            }
        }).catch(function(err) {
            console.error('Failed to load votes:', err);
            updateVoteUI(0, false);
        });
    }

    function castVote() {
        if (!db || !auth || !auth.currentUser) {
            window.location.href = 'members.html';
            return;
        }

        var user = auth.currentUser;
        var btnEl = document.getElementById('voteBtn');

        if (btnEl) {
            btnEl.disabled = true;
            btnEl.textContent = 'Voting...';
        }

        db.collection('landVotes').doc(user.uid).get().then(function(userDoc) {
            var userVotes = (userDoc.exists && userDoc.data().votes) ? userDoc.data().votes : [];

            if (userVotes.indexOf(targetId) !== -1) {
                alert('You have already voted for this land target!');
                loadVotes();
                return;
            }

            var updateData = {};
            updateData[targetId] = firebase.firestore.FieldValue.increment(1);

            return db.collection('landVotes').doc('totals').set(updateData, { merge: true }).then(function() {
                userVotes.push(targetId);
                return db.collection('landVotes').doc(user.uid).set({ votes: userVotes }, { merge: true });
            }).then(function() {
                if (typeof logToSheet === 'function') {
                    logToSheet('LandVotes', {
                        userId: user.uid,
                        email: user.email || 'unknown',
                        targetId: targetId,
                        voteDate: new Date().toISOString()
                    });
                }
                loadVotes();
                alert('Thank you for voting for ' + targetNames[targetId] + '!\n\nYour voice helps shape where the El Paso Verse frontier takes root.');
            });
        }).catch(function(err) {
            console.error('Vote failed:', err);
            alert('Something went wrong. Please try again.');
            loadVotes();
        });
    }

    // Bind vote button
    document.getElementById('voteBtn').addEventListener('click', castVote);

    // Load votes when auth is ready
    if (auth) {
        auth.onAuthStateChanged(function(user) {
            loadVotes();
        });
    } else {
        loadVotes();
    }
})();
