export const USER_ROLES = {
  ADMIN: 'admin',
  FIRST_YEAR_COORDINATOR: 'first_year_coordinator',
  SECOND_YEAR_COORDINATOR: 'second_year_coordinator', 
  THIRD_YEAR_COORDINATOR: 'third_year_coordinator',
  FOURTH_YEAR_COORDINATOR: 'fourth_year_coordinator'
} as const;

export const ACADEMIC_YEARS = {
  FIRST: 'first',
  SECOND: 'second',
  THIRD: 'third',
  FOURTH: 'fourth'
} as const;

export const SPORT_TYPES = {
  GAME: 'game',
  ATHLETIC: 'athletic'
} as const;

export const REGISTRATION_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected'
} as const;

export const getRoleLabel = (role: string) => {
  switch (role) {
    case USER_ROLES.ADMIN:
      return 'Administrator';
    case USER_ROLES.FIRST_YEAR_COORDINATOR:
      return 'First Year Coordinator';
    case USER_ROLES.SECOND_YEAR_COORDINATOR:
      return 'Second Year Coordinator';
    case USER_ROLES.THIRD_YEAR_COORDINATOR:
      return 'Third Year Coordinator';
    case USER_ROLES.FOURTH_YEAR_COORDINATOR:
      return 'Fourth Year Coordinator';
    default:
      return role;
  }
};

export const getYearLabel = (year: string) => {
  switch (year) {
    case ACADEMIC_YEARS.FIRST:
      return 'First Year';
    case ACADEMIC_YEARS.SECOND:
      return 'Second Year';
    case ACADEMIC_YEARS.THIRD:
      return 'Third Year';
    case ACADEMIC_YEARS.FOURTH:
      return 'Fourth Year';
    default:
      return year;
  }
};