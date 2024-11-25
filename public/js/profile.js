async function openPostModal(postId) {
    document.getElementById('postModal').style.display = 'flex';

    try {
        const response = await fetch(`/posts/${postId}`);
        const data = await response.json();

        const postDetails = document.getElementById('postDetails');
        postDetails.innerHTML = `
            <img src="${data.mediaUrl}" alt="Post Media" style="width: 100%; border-radius: 8px;">
            <div class="post-actions">
                    <span class="like-icon" onclick="toggleLike(event, '${data._id}')">❤️</span>
                    <span id="likes-count-${data._id}" onclick="openReactionModal('post','${data._id}', 'likes')">
                        ${data.likesCount}Likes
                      </span>

                    <span class="like-icon" onclick="toggledisLike(event, '${data._id}')">❤️</span>
                    <span id="dislikes-count-${data._id}" onclick="openReactionModal('post','${data._id}>', 'dislikes')">
                        ${data.dislikesCount} Dislikes
                      </span>
                      
    
                    <span class="comment-icon" onclick="openCommentSection('${data._id}')">💬</span>
                    <span>${data.comments.length} Comments</span>
                    ${
                        data.isOwner
                          ? `<button onclick="confirmDelete('post', '${data._id}')">Delete Post</button>`
                          : ''
                      }
                </div>
    
                <!-- Comment Section -->
                <div id="commentSection-${data._id}" class="commentSection" style="display: none;">
                    <h4>Comments</h4>
                    <ul id="comments-list-${data._id}">
                        <!-- Comments will be dynamically loaded -->
                    </ul>
                    <input type="text" id="new-comment-${data._id}" placeholder="Add a comment..." />
                    <button onclick="addComment('${data._id}')">Post</button>
                </div>
        `;
    } catch (error) {
        console.error("Error loading post details:", error);
    }
}


function closePostModal() {
    document.getElementById('postModal').style.display = 'none';
}

async function toggleLike(event, postId) {
    event.stopPropagation();
    try {
        const response = await fetch(`/posts/${postId}/like`, { method: 'POST' });
        const data = await response.json();

        // Update the like count
        document.getElementById(`likes-count-${postId}`).textContent = `${data.likesCount} Likes`;

        // If the likes modal is open, update it
         if (document.getElementById('likes-modal').style.display === 'block') {
            populateLikesModal(data.likedBy);
        }
    } catch (error) {
        console.error("Error toggling like:", error);
    }
}
async function toggledisLike(event, postId) {
    event.stopPropagation();
    try {
        const response = await fetch(`/posts/${postId}/dislike`, { method: 'POST' });
        const data = await response.json();

        // Update the like count
        document.getElementById(`dislikes-count-${postId}`).textContent = `${data.dislikesCount} DisLikes`;
    } catch (error) {
        console.error("Error toggling like:", error);
    }
}

function openCommentSection(postId) {
    const commentSection = document.getElementById(`commentSection-${postId}`);
    
    if (commentSection.style.display === 'none' || commentSection.style.display === '') {
        // Load comments only if the section is being opened
        loadComments(postId);
        commentSection.style.display = 'block';
    } else {
        // Toggle visibility to close the comment section
        commentSection.style.display = 'none';
    }
}

async function loadComments(postId) {
try {
        const response = await fetch(`/posts/${postId}`);
        const data = await response.json();

        const commentsList = document.getElementById(`comments-list-${postId}`);
        console.log(`comments-list-${postId}`, commentsList);

        commentsList.innerHTML = data.comments.map((comment) => `
        <li>
        <img src="${comment.user.profileImage || '/images/default-profile.png'}" 
            alt="${comment.user.username}'s profile image" 
            style="width: 30px; height: 30px; border-radius: 50%; margin-right: 5px;">
        <strong>${comment.user.username}:</strong> ${comment.content}
        <span>
        <button onclick="toggleCommentLike('${comment._id}')">❤️</button>
        <span id="comment-likes-${comment._id}" onclick="openReactionModal('comment','${comment._id}', 'likes')">${comment.likesCount} Likes</span>
        <button onclick="toggleCommentdisLike('${comment._id}')">❤️</button>
        <span id="comment-dislikes-${comment._id}" onclick="openReactionModal('comment','${comment._id}', 'dislikes')">${comment.dislikesCount} Dislikes</span>
        </span>
        ${comment.isOwner ? `<button onclick="confirmDelete('comment', '${comment._id}')">Delete Comment</button>` : ''}
        <button onclick="toggleReplyBox('${comment._id}')">Reply</button>

        <div id="reply-box-${comment._id}" class="reply-box" style="display: none; margin-top: 10px;">
        <input type="text" id="new-reply-${comment._id}" placeholder="Write a reply...">
        <button onclick="addReply('${comment._id}')">Post Reply</button>
        </div>

        <ul id="replies-list-${comment._id}" class="replies-list" style="margin-top: 10px; padding-left: 20px;">
        ${comment.replies.map((reply) => `
            <li>
            <img src="${reply.user.profileImage || '/images/default-profile.png'}" 
                alt="${reply.user.username}'s profile image" 
                style="width: 25px; height: 25px; border-radius: 50%; margin-right: 5px;">
            <strong>${reply.user.username}:</strong> ${reply.content}
            <span>
                <button onclick="toggleReplyLike('${comment._id}', '${reply._id}')">❤️</button>
                <span id="reply-likes-${reply._id}" onclick="openReactionModal('reply','${reply._id}', 'likes')">${reply.likesCount} Likes</span>
                <button onclick="toggleReplydisLike('${comment._id}', '${reply._id}')">❤️</button>
                <span id="reply-dislikes-${reply._id}" onclick="openReactionModal('reply','${reply._id}', 'dislikes')">${reply.dislikesCount} Dislikes</span>
                ${reply.isOwner ? `<button onclick="confirmDelete('reply', '${reply._id}')">Delete Reply</button>` : ''}
            </span>
            </li>
        `).join('')}
        </ul>
        </li>
        `).join('');
        } catch (error) {
        console.error('Error loading comments:', error);
        }
}



async function addComment(postId) {
    const commentText = document.getElementById(`new-comment-${postId}`).value.trim();
    if (!commentText) return;

    try {
        const response = await fetch(`/posts/${postId}/comment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: commentText }),
        });

        if (response.ok) {
            loadComments(postId); // Reload comments after posting a new one
            document.getElementById(`new-comment-${postId}`).value = ''; // Clear input
        }
    } catch (error) {
        console.error("Error adding comment:", error);
    }
}


function toggleReplyBox(commentId) {
    const replyBox = document.getElementById(`reply-box-${commentId}`);
    replyBox.style.display = replyBox.style.display === 'none' || replyBox.style.display === '' ? 'block' : 'none';
}

async function addReply(commentId) {
const replyInput = document.getElementById(`new-reply-${commentId}`);
const replyText = replyInput.value.trim();

if (!replyText) return;

try {
const response = await fetch(`/comments/${commentId}/reply`, {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ content: replyText }),
});

if (response.ok) {
const newReply = await response.json(); // Get the newly created reply data
replyInput.value = ''; // Clear the input field

// Dynamically add the new reply to the DOM
const repliesList = document.getElementById(`replies-list-${commentId}`);
if (repliesList) {
const replyHTML = `
  <li id="reply-${newReply._id}">
    <img src="${newReply.user.profileImage || '/images/default-profile.png'}" 
         alt="${newReply.user.username}'s profile image" 
         style="width: 25px; height: 25px; border-radius: 50%; margin-right: 5px;">
    <strong>${newReply.user.username}:</strong> ${newReply.content}
    <span>
      <button onclick="toggleReplyLike('${commentId}', '${newReply._id}')">❤️</button>
      <span id="reply-likes-${newReply._id}" onclick="openReactionModal('reply','${newReply._id}', 'likes')">0 Likes</span>
      <button onclick="toggleReplydisLike('${commentId}', '${newReply._id}')">❤️</button>
      <span id="reply-dislikes-${newReply._id}" onclick="openReactionModal('reply','${newReply._id}', 'dislikes')">0 Dislikes</span>
        ${newReply.isOwner ? `<button onclick="confirmDelete('reply', '${newReply._id}')">Delete Reply</button>` : ''}
    </span>
  </li>
`;
repliesList.insertAdjacentHTML('beforeend', replyHTML); // Add the new reply to the list

}
} else {
console.error('Error adding reply:', await response.text());
}
} catch (error) {
console.error('Error adding reply:', error);
}
}



async function toggleCommentLike(commentId) {
    try {
        const response = await fetch(`/comments/${commentId}/like`, { method: 'POST' });
        const data = await response.json();

        // Update the like count dynamically
        const likeCountElement = document.getElementById(`comment-likes-${commentId}`);
        if (likeCountElement) {
            likeCountElement.textContent = `${data.likesCount} Likes`;
        }
    } catch (error) {
        console.error("Error toggling comment like:", error);
    }
}
async function toggleCommentdisLike(commentId) {
    try {
        const response = await fetch(`/comments/${commentId}/dislike`, { method: 'POST' });
        const data = await response.json();

        // Update the like count dynamically
        const dislikeCountElement = document.getElementById(`comment-dislikes-${commentId}`);
        if (dislikeCountElement) {
            dislikeCountElement.textContent = `${data.dislikesCount} DisLikes`;
        }
    } catch (error) {
        console.error("Error toggling comment dislike:", error);
    }
}

async function toggleReplyLike(commentId, replyIndex) {
    try {
console.log("mohammad",replyIndex);

        const response = await fetch(`/comments/${commentId}/replies/${replyIndex}/like`, { method: 'POST' });
        const data = await response.json();

        // Update the like count dynamically
        const likeCountElement = document.getElementById(`reply-likes-${replyIndex}`);
        if (likeCountElement) {
            likeCountElement.textContent = `${data.likesCount} Likes`;
        }
    } catch (error) {
        console.error("Error toggling reply like:", error);
    }
}
async function toggleReplydisLike(commentId, replyIndex) {
    try {
console.log("mohammad",replyIndex);

        const response = await fetch(`/comments/${commentId}/replies/${replyIndex}/dislike`, { method: 'POST' });
        const data = await response.json();

        // Update the like count dynamically
        const dislikeCountElement = document.getElementById(`reply-dislikes-${replyIndex}`);
        if (dislikeCountElement) {
            dislikeCountElement.textContent = `${data.dislikesCount} Likes`;
        }
    } catch (error) {
        console.error("Error toggling reply Dislike:", error);
    }
}

function showLikes() {
    document.getElementById('likes-section').style.display = 'block';
    document.getElementById('dislikes-section').style.display = 'none';
    document.getElementById('likes-tab').classList.add('active');
    document.getElementById('dislikes-tab').classList.remove('active');
  }
  
  function showDislikes() {
    document.getElementById('likes-section').style.display = 'none';
    document.getElementById('dislikes-section').style.display = 'block';
    document.getElementById('dislikes-tab').classList.add('active');
    document.getElementById('likes-tab').classList.remove('active');
  }
  
  async function openReactionModal(type, id, section) {
    const modal = document.getElementById('reaction-modal');
    modal.style.display = 'flex';
  
    try {
      const response = await fetch(`/posts/${type}/${id}/reactions`);
      const data = await response.json();
      if (response.ok) {
        populateLikesList(data.likedBy);
        populateDislikesList(data.dislikedBy);
  
        // Show the appropriate section based on the clicked button
        if (section === 'likes') {
          showLikes();
        } else if (section === 'dislikes') {
          showDislikes();
        }
      } else {
        console.error('Error fetching reactions:', data.message || 'Unknown error');
      }
    } catch (error) {
      console.error('Error fetching reactions:', error);
    }
  }
  
  
  function closeReactionModal() {
    document.getElementById('reaction-modal').style.display = 'none';
  }
  
  function populateLikesList(likedBy) {
    const likesList = document.getElementById('likes-list');
    likesList.innerHTML = ''; // Clear previous list
  
    likedBy.forEach(user => {
      const listItem = document.createElement('li');
      listItem.style.display = 'flex';
      listItem.style.alignItems = 'center';
      listItem.style.marginBottom = '10px';
  
      const img = document.createElement('img');
      img.src = user.profileImage;
      img.alt = `${user.username}'s profile image`;
      img.style.width = '40px';
      img.style.height = '40px';
      img.style.borderRadius = '50%';
      img.style.marginRight = '10px';
  
      const username = document.createElement('span');
      username.textContent = user.username;
  
      listItem.appendChild(img);
      listItem.appendChild(username);
      likesList.appendChild(listItem);
    });
  }
  
  function populateDislikesList(dislikedBy) {
    const dislikesList = document.getElementById('dislikes-list');
    dislikesList.innerHTML = ''; // Clear previous list
  
    dislikedBy.forEach(user => {
      const listItem = document.createElement('li');
      listItem.style.display = 'flex';
      listItem.style.alignItems = 'center';
      listItem.style.marginBottom = '10px';
  
      const img = document.createElement('img');
      img.src = user.profileImage;
      img.alt = `${user.username}'s profile image`;
      img.style.width = '40px';
      img.style.height = '40px';
      img.style.borderRadius = '50%';
      img.style.marginRight = '10px';
  
      const username = document.createElement('span');
      username.textContent = user.username;
  
      listItem.appendChild(img);
      listItem.appendChild(username);
      dislikesList.appendChild(listItem);
    });
  }
  
      let deleteType = '';
      let deleteId = '';
  
      function confirmDelete(type, id) {
          deleteType = type;
          deleteId = id;
          document.getElementById('delete-modal').style.display = 'block';
      }
  
      function closeDeleteModal() {
          document.getElementById('delete-modal').style.display = 'none';
      }
  
      async function performDelete(postid) {
          try {
              const response = await fetch(`/posts/delete/${deleteType}/${deleteId}`, { method: 'DELETE' });
              if (response.ok) {
                  alert("Deleted successfully");
                  if(deleteType=='comment' || deleteType=='reply')
                      loadComments(postid);
                  else
                      location.reload();
              } else {
                  console.error("Error deleting:", await response.json());
              }
          } catch (error) {
              console.error("Error performing delete:", error);
          }
          closeDeleteModal();
      }