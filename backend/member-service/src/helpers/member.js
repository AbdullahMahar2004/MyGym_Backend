function isActive(member) {
  if (!member.plan) return false;
  if (member.plan.isSessional) {
    return member.sessionCount < member.plan.numberOfSessions;
  }
  return new Date(member.endDate) > new Date();
}

function isFrozen(member) {
  if (member.freezeStartDate && member.freezeEndDate) {
    const now = new Date();
    return now >= new Date(member.freezeStartDate) && now <= new Date(member.freezeEndDate);
  }
  return false;
}

function toDto(member) {
  return {
    id: member.id,
    name: member.name,
    email: member.email,
    phoneNumber: member.phoneNumber,
    trainerName: member.trainer ? member.trainer.name : 'No Trainer Assigned',
    planName: member.plan
      ? member.plan.name + (member.trainer ? ` - ${member.trainer.name}` : ' (No Trainer Assigned)')
      : 'No Plan Assigned',
    startDate: member.startDate,
    endDate: member.endDate,
    applicationUserName: member.user ? member.user.username : 'No Application User Assigned',
    sessionCount: member.sessionCount,
    maxSessions: member.plan
      ? member.plan.numberOfSessions === -1
        ? 'Unlimited'
        : String(member.plan.numberOfSessions)
      : 'N/A',
    isActive: isActive(member),
    isFrozen: isFrozen(member),
    freezeStartDate: member.freezeStartDate,
    freezeEndDate: member.freezeEndDate,
    frozenDuration: member.frozenDuration,
    applicationUserId: member.userId
  };
}

module.exports = { isActive, isFrozen, toDto };
