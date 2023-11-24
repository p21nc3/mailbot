/* 👉 Node.js based app that is able to respond to emails sent to your Gmail mailbox while you’re out on a vacation. 
   👉 It uses the Gmail API to check for new emails and send replies to emails that have no prior replies.
   👉 It uses OAuth2 to authenticate the app with the Gmail API.
*/

// Using the Gmail API to check for new emails and send replies to emails that have no prior replies.
  const { google } = require("googleapis");

  const {
    CLIENT_ID,
    CLIENT_SECRET,
    REDIRECT_URI,
    REFRESH_TOKEN,
  } = require("./credentials");
  
  // using OAuth2Client to authorize the Gmail API
  const oAuth2Client = new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    REDIRECT_URI
  );
  oAuth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });
  
  const repliedUsers = new Set();
  // checkEmailsAndSendReplies function to check for new emails and send replies to emails that have no prior replies.
  async function checkEmailsAndSendReplies() {
    try {
      const gmail = google.gmail({ version: "v1", auth: oAuth2Client });
  
      const res = await gmail.users.messages.list({ // list all unread emails
        userId: "me",
        q: "is:unread",
      });
      const messages = res.data.messages;
      if (messages && messages.length > 0) {
        for (const message of messages) {
          const email = await gmail.users.messages.get({
            userId: "me",
            id: message.id,
          });
          const from = email.data.payload.headers.find(
            (header) => header.name === "From" // find the email address of the sender
          );
          const toHeader = email.data.payload.headers.find(
            (header) => header.name === "To" // find the email address of the recipient
          );
          const Subject = email.data.payload.headers.find(
            (header) => header.name === "Subject" // find the subject of the email
          );
          const From = from.value;
          const toEmail = toHeader.value;
          const subject = Subject.value;
          console.log("email come From", From);
          console.log("to Email", toEmail);
          if (repliedUsers.has(From)) {
            console.log("Already replied to : ", From);
            continue;
          }
          // get the thread of the email
          const thread = await gmail.users.threads.get({
            userId: "me", 
            id: message.threadId,
          });
          const replies = thread.data.messages.slice(1);
  
          if (replies.length === 0) {
            await gmail.users.messages.send({
              userId: "me",
              requestBody: {
                raw: await createReplyRaw(toEmail, From, subject), // create a reply to the email
              },
            });
            // create a label to mark the email as replied
            const labelName = "onVacation";
            await gmail.users.messages.modify({
              userId: "me",
              id: message.id,
              requestBody: {
                addLabelIds: [await createLabelIfNeeded(labelName)], 
              },
            });
  
            console.log("Sent reply to email:", From);
            repliedUsers.add(From);
          }
        }
      }
    } catch (error) {
      console.error("Error occurred:", error); // log any errors that occur during the execution
    }
  }
  // createReplyRaw function to create a reply to the email
  async function createReplyRaw(from, to, subject) {
    const emailContent = `From: ${from}\nTo: ${to}\nSubject: ${subject}\n\nHi, \n\nThanks for your mail. I am unavailable right now, but will respond as soon as possible...`;
    const base64EncodedEmail = Buffer.from(emailContent)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");
  
    return base64EncodedEmail;
  }
  async function createLabelIfNeeded(labelName) { // create a label to mark the email as replied
    const gmail = google.gmail({ version: "v1", auth: oAuth2Client });
    const res = await gmail.users.labels.list({ userId: "me" });
    const labels = res.data.labels;
  
    const existingLabel = labels.find((label) => label.name === labelName);
    if (existingLabel) {
      return existingLabel.id;
    }
    const newLabel = await gmail.users.labels.create({
      userId: "me",
      requestBody: {
        name: labelName,
        labelListVisibility: "labelShow",
        messageListVisibility: "show",
      },
    }); 
  
    return newLabel.data.id;
  }
  function getRandomInterval(min, max) { 
    // generate a random interval between min and max
    return Math.floor(Math.random() * (max - min + 1) + min);
  }
  setInterval(checkEmailsAndSendReplies, getRandomInterval(45, 120) * 1000); // check for new emails and send replies to emails that have no prior replies.
