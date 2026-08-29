import conversationService from '../services/conversationService.js';

export const createConversation = async (req, res) => {
  try {
    const userId = req.user.id;
    const { title } = req.body;

    const conversation = await conversationService.createConversation(userId, title);
    
    res.json({
      success: true,
      conversation
    });
  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(500).json({ error: 'Failed to create conversation' });
  }
};

export const getConversations = async (req, res) => {
  try {
    const userId = req.user.id;
    const conversations = await conversationService.getUserConversations(userId);
    
    res.json({
      success: true,
      conversations
    });
  } catch (error) {
    console.error('Error getting conversations:', error);
    res.status(500).json({ error: 'Failed to get conversations' });
  }
};

export const getConversationById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const conversation = await conversationService.getConversationWithMessages(id, userId);
    
    res.json({
      success: true,
      conversation
    });
  } catch (error) {
    console.error('Error getting conversation:', error);
    if (error.message === 'Conversation not found' || error.message === 'Access denied') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to get conversation' });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    const { question } = req.body;

    if (!question || question.trim() === '') {
      return res.status(400).json({ error: 'Question is required' });
    }

    // Check if streaming is requested
    const stream = req.query.stream === 'true';

    if (stream) {
      // Set up SSE streaming
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      await conversationService.sendMessageStream(id, userId, userRole, question, res);
    } else {
      // Non-streaming response (original behavior)
      const result = await conversationService.sendMessage(id, userId, userRole, question);

      res.json({
        success: true,
        ...result
      });
    }
  } catch (error) {
    console.error('Error sending message:', error);
    if (error.message === 'Conversation not found' || error.message === 'Access denied') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to send message' });
  }
};

export const deleteConversation = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    await conversationService.deleteConversation(id, userId);
    
    res.json({
      success: true,
      message: 'Conversation deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    if (error.message === 'Conversation not found' || error.message === 'Access denied') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to delete conversation' });
  }
};

export const updateConversationTitle = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { title } = req.body;

    if (!title || title.trim() === '') {
      return res.status(400).json({ error: 'Title is required' });
    }

    const conversation = await conversationService.updateConversationTitle(id, userId, title);
    
    res.json({
      success: true,
      conversation
    });
  } catch (error) {
    console.error('Error updating conversation title:', error);
    if (error.message === 'Conversation not found' || error.message === 'Access denied') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to update conversation title' });
  }
};

export const executePendingAction = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    const { actionId, actionData } = req.body;

    if (!actionId) {
      return res.status(400).json({ error: 'Action ID is required' });
    }

    const result = await conversationService.executePendingAction(id, userId, userRole, actionId, actionData);
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error executing pending action:', error);
    if (error.message === 'Conversation not found' || error.message === 'Access denied') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to execute action' });
  }
};
