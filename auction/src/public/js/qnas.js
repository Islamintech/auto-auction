function answerQna(id) {
    const answer = prompt('Enter your answer:');
    if (!answer || !answer.trim()) return;

    fetch(`/admin/qna/${id}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answer }),
    })
    .then(res => res.json())
    .then(() => window.location.reload())
    .catch(() => alert('Failed to submit answer'));
}