//========================================================================
// Drag and drop image handling
//========================================================================

var fileDrag = document.getElementById("file-drag");
var fileSelect = document.getElementById("file-upload");

// Add event listeners
fileDrag.addEventListener("dragover", fileDragHover, false);
fileDrag.addEventListener("dragleave", fileDragHover, false);
fileDrag.addEventListener("drop", fileSelectHandler, false);
fileSelect.addEventListener("change", fileSelectHandler, false);

function fileDragHover(e) {
  // prevent default behaviour
  e.preventDefault();
  e.stopPropagation();

  fileDrag.className = e.type === "dragover" ? "upload-box dragover" : "upload-box";
}

function fileSelectHandler(e) {
  // handle file selecting
  var files = e.target.files || e.dataTransfer.files;
  fileDragHover(e);
  for (var i = 0, f; (f = files[i]); i++) {
    previewFile(f);
  }
}

//========================================================================
// Web page elements for functions to use
//========================================================================

var imagePreview = document.getElementById("image-preview");
var imageDisplay = document.getElementById("image-display");
var uploadCaption = document.getElementById("upload-caption");
var predResult = document.getElementById("pred-result");
var loader = document.getElementById("loader");

//========================================================================
// Main button events
//========================================================================

function submitImage() {
  // action for the submit button
  console.log("submit");

  if (!imageDisplay.src || !imageDisplay.src.startsWith("data")) {
    window.alert("Please select an image before submit.");
    return;
  }

  loader.classList.remove("hidden");
  imageDisplay.classList.add("loading");

  // call the predict function of the backend
  predictImage(imageDisplay.src);
}

function clearImage() {
  // reset selected files
  fileSelect.value = "";

  // remove image sources and hide them
  imagePreview.src = "";
  imageDisplay.src = "";
  predResult.innerHTML = "";

  hide(imagePreview);
  hide(imageDisplay);
  hide(loader);
  hide(predResult);
  show(uploadCaption);

  imageDisplay.classList.remove("loading");
}

function previewFile(file) {
  // show the preview of the image
  console.log(file.name);
  var fileName = encodeURI(file.name);

  var reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onloadend = () => {
    imagePreview.src = URL.createObjectURL(file);

    show(imagePreview);
    hide(uploadCaption);

    // reset
    predResult.innerHTML = "";
    imageDisplay.classList.remove("loading");

    displayImage(reader.result, "image-display");
  };
}

//========================================================================
// Helper functions
//========================================================================

function predictImage(image) {
  fetch("/predict", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(image)
  })
    .then(resp => {
      if (resp.ok)
        resp.json().then(data => {
          displayResult(data);
        });
    })
    .catch(err => {
      console.log("An error occured", err.message);
      window.alert("Oops! Something went wrong.");
    });
}

function displayImage(image, id) {
  // display image on given id <img> element
  let display = document.getElementById(id);
  display.src = image;
  show(display);
}

function displayResult(data) {
  // display the result
  hide(loader);
  
  // Display prediction result
  predResult.innerHTML = `<strong>Diagnosis:</strong> ${data.result}<br><strong>Confidence:</strong> ${(data.probability * 100).toFixed(2)}%`;
  show(predResult);
  
  // Create or get recommendation element
  let recommendationElement = document.getElementById("recommendation");
  if (!recommendationElement) {
    recommendationElement = document.createElement("div");
    recommendationElement.id = "recommendation";
    recommendationElement.style.marginTop = "20px";
    recommendationElement.style.padding = "10px";
    recommendationElement.style.backgroundColor = "#f8f9fa";
    recommendationElement.style.borderRadius = "5px";
    
    // Insert after the image-box div
    document.getElementById("image-box").after(recommendationElement);
  }
  
  // Set recommendation content
  if (data.recommendation) {
    recommendationElement.innerHTML = "<h4>Recommendation:</h4><p>" + data.recommendation + "</p>";
    recommendationElement.classList.remove("hidden");
  } else {
    recommendationElement.classList.add("hidden");
  }

  // Update current disease and show chat button
  currentDisease = data.result;
  document.getElementById('openChat').style.display = 'block';
  document.getElementById('openChat').textContent = `Ask About ${currentDisease}`;
}

function hide(el) {
  // hide an element
  el.classList.add("hidden");
}

function show(el) {
  // show an element
  el.classList.remove("hidden");
}

// Add this to your existing JavaScript
document.addEventListener('DOMContentLoaded', function() {
  const openChatBtn = document.getElementById('openChat');
  const chatContainer = document.getElementById('chatContainer');
  const closeChatBtn = document.getElementById('closeChat');
  const sendMessageBtn = document.getElementById('sendMessage');
  const userMessageInput = document.getElementById('userMessage');
  const chatMessages = document.getElementById('chatMessages');
  
  // let currentDisease = '';
  
  // Open chat when the button is clicked
  openChatBtn.addEventListener('click', function() {
      chatContainer.style.display = 'block';
      openChatBtn.style.display = 'none';
      addMessage('assistant', 'Hello! I can help answer questions about ' + currentDisease + 
                '. What would you like to know about symptoms, treatments, or when to see a doctor?');
  });
  
  // Close chat
  closeChatBtn.addEventListener('click', function() {
      chatContainer.style.display = 'none';
      openChatBtn.style.display = 'block';
  });
  
  // Send message
  sendMessageBtn.addEventListener('click', sendMessage);
  userMessageInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') sendMessage();
  });
  
  function sendMessage() {
      const message = userMessageInput.value.trim();
      if (message) {
          addMessage('user', message);
          userMessageInput.value = '';
          
          // Send to server
          fetch('/chat', {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                  message: message,
                  disease_context: currentDisease
              })
          })
          .then(response => response.json())
          .then(data => {
              if (data.response) {
                  addMessage('assistant', data.response);
              } else if (data.error) {
                  addMessage('assistant', 'Sorry, I encountered an error: ' + data.error);
              }
          })
          .catch(error => {
              addMessage('assistant', 'Sorry, I couldn\'t process your request.');
              console.error('Error:', error);
          });
      }
  }
  
  function addMessage(sender, text) {
    const messageDiv = document.createElement('div');
    messageDiv.className = sender === 'user' ? 'user-message' : 'assistant-message';
    messageDiv.style.textAlign = sender === 'user' ? 'right' : 'left';
    messageDiv.style.margin = '5px';
    messageDiv.style.padding = '8px';
    messageDiv.style.borderRadius = '5px';
    messageDiv.style.maxWidth = '80%'; // Ensures messages don't stretch too much
    messageDiv.style.wordWrap = 'break-word'; // Prevents overflow issues
    messageDiv.style.backgroundColor = sender === 'user' ? '#d1ecf1' : '#f8d7da';
    messageDiv.innerHTML = `<strong>${sender === 'user' ? 'You' : 'Assistant'}:</strong> ${text}`;
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

  
  // In your existing prediction success handler, add:
  // currentDisease = result.result;
  // document.getElementById('openChat').style.display = 'block';
});

function sendMessage() {
  const message = userMessageInput.value.trim();
  if (message) {
      addMessage('user', message);
      userMessageInput.value = '';
      
      // Show typing indicator
      const typingIndicator = document.createElement('div');
      typingIndicator.id = 'typing';
      typingIndicator.textContent = 'Assistant is typing...';
      chatMessages.appendChild(typingIndicator);
      chatMessages.scrollTop = chatMessages.scrollTop;
      
      fetch('/chat', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
          },
          body: JSON.stringify({
              message: message,
              disease_context: currentDisease
          })
      })
      .then(response => {
          // Remove typing indicator
          document.getElementById('typing')?.remove();
          
          if (!response.ok) {
              return response.json().then(err => { throw err; });
          }
          return response.json();
      })
      .then(data => {
          if (data.response) {
              addMessage('assistant', data.response);
          } else {
              throw new Error(data.error || 'No response from server');
          }
      })
      .catch(error => {
          console.error('Error:', error);
          addMessage('assistant', `Error: ${error.message || 'Failed to get response'}`);
      });
  }
}