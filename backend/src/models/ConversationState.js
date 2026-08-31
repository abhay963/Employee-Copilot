import { query } from '../db/connection.js';

export class ConversationState {
  static async findByConversationId(conversationId) {
    const result = await query(
      'SELECT * FROM conversation_state WHERE conversation_id = $1',
      [conversationId]
    );
    return result.rows[0];
  }

  static async findByUserId(userId) {
    const result = await query(
      'SELECT * FROM conversation_state WHERE user_id = $1 ORDER BY last_updated DESC',
      [userId]
    );
    return result.rows;
  }

  static async findByActionId(actionId) {
    const result = await query(
      'SELECT * FROM conversation_state WHERE action_id = $1',
      [actionId]
    );
    return result.rows[0];
  }

  static async create(data) {
    const {
      conversation_id,
      user_id,
      intent = null,
      pending_action = null,
      action_id = null,
      workflow_step = 'IDLE',
      context = {},
      calendar_status = 'UNKNOWN'
    } = data;

    const result = await query(
      `INSERT INTO conversation_state 
       (conversation_id, user_id, intent, pending_action, action_id, workflow_step, context, calendar_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        conversation_id,
        user_id,
        intent,
        JSON.stringify(pending_action || {}),
        action_id,
        workflow_step,
        JSON.stringify(context || {}),
        calendar_status
      ]
    );
    return result.rows[0];
  }

  static async update(conversationId, data) {
    const {
      intent = null,
      pending_action = null,
      action_id = null,
      workflow_step = null,
      context = null,
      calendar_status = null
    } = data;

    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (intent !== null) {
      updates.push(`intent = $${paramIndex++}`);
      values.push(intent);
    }

    if (pending_action !== null) {
      updates.push(`pending_action = $${paramIndex++}`);
      values.push(JSON.stringify(pending_action));
    }

    if (action_id !== null) {
      updates.push(`action_id = $${paramIndex++}`);
      values.push(action_id);
    }

    if (workflow_step !== null) {
      updates.push(`workflow_step = $${paramIndex++}`);
      values.push(workflow_step);
    }

    if (context !== null) {
      updates.push(`context = $${paramIndex++}`);
      values.push(JSON.stringify(context));
    }

    if (calendar_status !== null) {
      updates.push(`calendar_status = $${paramIndex++}`);
      values.push(calendar_status);
    }

    updates.push(`last_updated = CURRENT_TIMESTAMP`);
    values.push(conversationId);

    const result = await query(
      `UPDATE conversation_state 
       SET ${updates.join(', ')}
       WHERE conversation_id = $${paramIndex}
       RETURNING *`,
      values
    );
    return result.rows[0];
  }

  static async delete(conversationId) {
    const result = await query(
      'DELETE FROM conversation_state WHERE conversation_id = $1 RETURNING *',
      [conversationId]
    );
    return result.rows[0];
  }

  static async clearPendingAction(conversationId) {
    const result = await query(
      `UPDATE conversation_state 
       SET pending_action = '{}',
           action_id = NULL,
           workflow_step = 'IDLE',
           last_updated = CURRENT_TIMESTAMP
       WHERE conversation_id = $1
       RETURNING *`,
      [conversationId]
    );
    return result.rows[0];
  }

  static async setWorkflowStep(conversationId, step) {
    const result = await query(
      `UPDATE conversation_state 
       SET workflow_step = $1,
           last_updated = CURRENT_TIMESTAMP
       WHERE conversation_id = $2
       RETURNING *`,
      [step, conversationId]
    );
    return result.rows[0];
  }

  static async hasPendingAction(conversationId) {
    const result = await query(
      `SELECT EXISTS(
         SELECT 1 FROM conversation_state 
         WHERE conversation_id = $1 
         AND action_id IS NOT NULL 
         AND workflow_step IN ('READY_FOR_CONFIRMATION', 'COLLECTING_DETAILS')
       ) as has_pending`,
      [conversationId]
    );
    return result.rows[0]?.has_pending || false;
  }
}