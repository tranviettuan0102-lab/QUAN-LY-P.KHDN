import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  onSnapshot,
  serverTimestamp,
  Timestamp,
  getDocFromServer
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { KPI, Dossier, Customer, ActivityLog, User, YearlyPlan, KpiDetail } from '../types';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Check connection
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}

// User Profiles
export async function deleteUser(userId: string) {
  const userRef = doc(db, 'users', userId);
  try {
    await deleteDoc(userRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `users/${userId}`);
  }
}

export function subscribeToUsers(callback: (users: User[]) => void) {
  const userCollection = collection(db, 'users');
  return onSnapshot(userCollection, (snapshot) => {
    const users = snapshot.docs.map(doc => doc.data() as User);
    callback(users);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, 'users');
  });
}

export async function createKpi(kpi: KPI) {
  const kpiRef = doc(db, 'kpis', kpi.id);
  try {
    await setDoc(kpiRef, kpi);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `kpis/${kpi.id}`);
  }
}

// User Profile
export async function getUserProfile(userId: string): Promise<User | null> {
  try {
    const userRef = doc(db, 'users', userId);
    const snapshot = await getDoc(userRef);
    if (snapshot.exists()) {
      return snapshot.data() as User;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, 'users');
    return null;
  }
}

export async function ensureUserProfile(user: User) {
  const userRef = doc(db, 'users', user.id);
  try {
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      await setDoc(userRef, { ...user, emailVerified: auth.currentUser?.emailVerified });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${user.id}`);
  }
}

// KPIs
export function subscribeToKpis(userId: string, role: string, callback: (kpis: KPI[]) => void) {
  const kpiCollection = collection(db, 'kpis');
  // Both roles need to fetch all KPIs to compile aggregate figures 
  return onSnapshot(kpiCollection, (snapshot) => {
    const kpis = snapshot.docs.map(doc => doc.data() as KPI);
    callback(kpis);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, 'kpis');
  });
}

export async function updateKpiValue(kpiId: string, value: number, field: 'target' | 'actual') {
  const kpiRef = doc(db, 'kpis', kpiId);
  try {
    await updateDoc(kpiRef, { [field]: value });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `kpis/${kpiId}`);
  }
}

// Dossiers
export function subscribeToDossiers(userId: string, role: string, callback: (dossiers: Dossier[]) => void) {
  const dossierCollection = collection(db, 'dossiers');
  const q = role === 'Manager' ? dossierCollection : query(dossierCollection, where('userId', '==', userId));
  
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map(doc => {
      const d = doc.data();
      return { 
        ...d, 
        updatedAt: d.updatedAt instanceof Timestamp ? d.updatedAt.toDate().toISOString() : d.updatedAt 
      } as Dossier;
    });
    callback(data);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, 'dossiers');
  });
}

export async function updateDossierStatus(dossierId: string, status: Dossier['status'], userId: string) {
  const dossierRef = doc(db, 'dossiers', dossierId);
  try {
    await updateDoc(dossierRef, { status, updatedAt: serverTimestamp() });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `dossiers/${dossierId}`);
  }
}

export async function addDossier(dossier: Omit<Dossier, 'updatedAt'>) {
  const dossierRef = doc(collection(db, 'dossiers'), dossier.id);
  try {
    await setDoc(dossierRef, { ...dossier, updatedAt: serverTimestamp() });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'dossiers');
  }
}

export async function updateYearlyPlan(plan: YearlyPlan) {
  const ref = doc(db, 'yearlyPlans', plan.id);
  try {
    await setDoc(ref, plan, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `yearlyPlans/${plan.id}`);
  }
}

export function subscribeToYearlyPlans(userId: string, role: string, callback: (plans: YearlyPlan[]) => void) {
  const plansCollection = collection(db, 'yearlyPlans');
  const q = role === 'Manager' ? plansCollection : query(plansCollection, where('userId', '==', userId));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => doc.data() as YearlyPlan));
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, 'yearlyPlans');
  });
}

// Customers
export function subscribeToCustomers(userId: string, role: string, callback: (customers: Customer[]) => void) {
  const custCollection = collection(db, 'customers');
  const q = role === 'Manager' ? custCollection : query(custCollection, where('userId', '==', userId));
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map(doc => doc.data() as Customer);
    callback(data);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, 'customers');
  });
}

export async function addCustomer(customer: Customer) {
  const custRef = doc(collection(db, 'customers'), customer.id);
  try {
    await setDoc(custRef, customer);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'customers');
  }
}

export async function updateCustomer(customerId: string, data: Partial<Customer>) {
  const custRef = doc(db, 'customers', customerId);
  try {
    await updateDoc(custRef, data);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `customers/${customerId}`);
  }
}

export async function addKpiDetail(detail: KpiDetail) {
  const ref = doc(collection(db, 'kpiDetails'), detail.id);
  try {
    await setDoc(ref, detail);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'kpiDetails');
  }
}

export function subscribeToKpiDetails(kpiId: string, callback: (details: KpiDetail[]) => void) {
  if (!kpiId) return () => {};
  const q = query(collection(db, 'kpiDetails'), where('kpiId', '==', kpiId));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => doc.data() as KpiDetail));
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, 'kpiDetails');
  });
}

// Logs
export function subscribeToLogs(userId: string, role: string, callback: (logs: ActivityLog[]) => void) {
  const logCollection = collection(db, 'logs');
  const q = role === 'Manager' ? logCollection : query(logCollection, where('userId', '==', userId));
  
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map(doc => {
      const d = doc.data();
      return { 
        ...d, 
        date: d.date instanceof Timestamp ? d.date.toDate().toISOString() : d.date 
      } as ActivityLog;
    });
    callback(data);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, 'logs');
  });
}

export async function addLogEntry(description: string, result: string) {
  if (!auth.currentUser) return;
  const logRef = doc(collection(db, 'logs'));
  try {
    await setDoc(logRef, {
      id: logRef.id,
      userId: auth.currentUser.uid,
      description,
      result,
      date: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'logs');
  }
}
