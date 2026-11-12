document.addEventListener('DOMContentLoaded', () => {
    let active = 0, banned = 0, deleted = 0;

    document.querySelectorAll('.member-row').forEach(row => {
        const status = row.dataset.status;
        if (status === 'ACTIVE') active++;
        else if (status === 'BANNED') banned++;
        else if (status === 'DELETE') deleted++;
    });

    document.getElementById('count-active').textContent  = active;
    document.getElementById('count-banned').textContent  = banned;
    document.getElementById('count-deleted').textContent = deleted;
});

function filterMembers() {
    const query = document.getElementById('search-input').value.toLowerCase();
    document.querySelectorAll('.member-row').forEach(row => {
        const nick  = row.dataset.nick  || '';
        const phone = row.dataset.phone || '';
        row.style.display = (nick.includes(query) || phone.includes(query)) ? '' : 'none';
    });
}

function updateMemberStatus(select) {
    const memberId     = select.id;
    const memberStatus = select.value;

    // update select color
    select.className = select.className.replace(/status-\w+/g, '');
    if (memberStatus === 'ACTIVE') select.classList.add('status-active');
    else if (memberStatus === 'BANNED') select.classList.add('status-banned');
    else select.classList.add('status-delete');

    fetch('/admin/member/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ _id: memberId, memberStatus }),
    })
    .then(res => res.json())
    .then(() => alert('Member status updated'))
    .catch(() => alert('Failed to update status'));
}

function viewMember(id) {
    alert(`Member ID: ${id}`);
    // future: open member detail modal
}