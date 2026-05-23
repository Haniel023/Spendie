export const processRecurringTransactions = async ({ supabase, spaceId }) => {
  const today = new Date();
  const todayString = today.toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('recurring_transactions')
    .select('*')
    .eq('space_id', spaceId);

  if (error) {
    console.error(error);
    return;
  }

  for (const recurring of data) {
    let shouldRun = false;
    const nextRun = new Date(recurring.next_run);

    if (
      (recurring.frequency === 'daily' ||
        recurring.frequency === 'weekly' ||
        recurring.frequency === 'monthly') &&
      nextRun <= today
    ) {
      shouldRun = true;
    }

    if (recurring.frequency === 'semi_monthly') {
      const currentDay = today.getDate();
      if (
        currentDay === recurring.recurring_day_1 ||
        currentDay === recurring.recurring_day_2
      ) {
        if (recurring.last_processed_date !== todayString) {
          shouldRun = true;
        }
      }
    }

    if (!shouldRun) continue;

    await supabase.from('transactions').insert([
      {
        space_id: recurring.space_id,
        created_by: recurring.created_by,
        type: recurring.type,
        amount: recurring.amount,
        category: recurring.category,
        description: recurring.description,
        emoji: recurring.emoji || null,
      },
    ]);

    let nextDate = new Date(today);
    if (recurring.frequency === 'daily') nextDate.setDate(nextDate.getDate() + 1);
    if (recurring.frequency === 'weekly') nextDate.setDate(nextDate.getDate() + 7);
    if (recurring.frequency === 'monthly') nextDate.setMonth(nextDate.getMonth() + 1);

    await supabase
      .from('recurring_transactions')
      .update({
        next_run:
          recurring.frequency === 'semi_monthly'
            ? todayString
            : nextDate.toISOString().split('T')[0],
        last_processed_date:
          recurring.frequency === 'semi_monthly' ? todayString : null,
      })
      .eq('id', recurring.id);
  }
};
