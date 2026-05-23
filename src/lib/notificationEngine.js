export const createNotification = async ({ supabase, userId, title, message, type = 'info' }) => {
  const { error } = await supabase
    .from('notifications')
    .insert([{ user_id: userId, title, message, type }]);

  if (error) {
    console.error('Failed to create notification:', error);
    return false;
  }
  return true;
};
