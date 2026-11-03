/**
 * Genuine In-Memory Database and Supabase Client Mock for Lab_Link Test Suites
 * Implements stateful Postgres/Supabase tables, RPCs, Auth, and Functions.
 */

export interface MockDatabaseState {
  items: any[];
  categories: any[];
  departments: any[];
  profiles: any[];
  user_roles: any[];
  user_departments: any[];
  issued_items: any[];
  borrow_requests: any[];
  maintenance_records: any[];
  notifications: any[];
  audit_logs: any[];
  otp_verifications: any[];
}

export function createInitialDbState(): MockDatabaseState {
  return {
    items: [
      {
        id: "11111111-1111-1111-1111-111111111111",
        name: "Digital Multimeter Fluke 87V",
        item_code: "DMM-001",
        status: "available",
        condition: "excellent",
        current_quantity: 10,
        minimum_quantity: 2,
        reorder_threshold: 2,
        unit: "piece",
        is_borrowable: true,
        category_id: "cat-electronics",
        department_id: "dept-ece",
        storage_location: "Shelf A-1",
        lab_location: "Lab 101",
        shelf_location: "A1",
        warranty_until: "2027-12-31",
      },
      {
        id: "22222222-2222-2222-2222-222222222222",
        name: "Oscilloscope Rigol DS1054Z",
        item_code: "OSC-002",
        status: "available",
        condition: "good",
        current_quantity: 1,
        minimum_quantity: 1,
        reorder_threshold: 1,
        unit: "piece",
        is_borrowable: true,
        category_id: "cat-electronics",
        department_id: "dept-ece",
        storage_location: "Shelf B-2",
        lab_location: "Lab 101",
        shelf_location: "B2",
        warranty_until: "2026-06-30",
      },
      {
        id: "33333333-3333-3333-3333-333333333333",
        name: "Spectrophotometer UV-Vis",
        item_code: "SPEC-003",
        status: "available",
        condition: "good",
        current_quantity: 0, // Depleted / out-of-stock item
        minimum_quantity: 1,
        reorder_threshold: 1,
        unit: "piece",
        is_borrowable: true,
        category_id: "cat-chemistry",
        department_id: "dept-chem",
        storage_location: "Room 204",
        lab_location: "Lab 204",
        shelf_location: "C3",
        warranty_until: "2025-01-01",
      },
      {
        id: "44444444-4444-4444-4444-444444444444",
        name: "Microscope Olympus CX23",
        item_code: "MIC-004",
        status: "under_maintenance",
        condition: "fair",
        current_quantity: 2,
        minimum_quantity: 1,
        reorder_threshold: 1,
        unit: "piece",
        is_borrowable: false,
        category_id: "cat-biology",
        department_id: "dept-bio",
        storage_location: "Room 302",
        lab_location: "Lab 302",
        shelf_location: "D4",
        warranty_until: "2026-12-31",
      },
    ],
    categories: [
      { id: "cat-electronics", name: "Electronics & Sensors", color_hex: "#3b82f6" },
      { id: "cat-chemistry", name: "Chemistry & Reagents", color_hex: "#10b981" },
      { id: "cat-biology", name: "Biology & Life Sciences", color_hex: "#8b5cf6" },
    ],
    departments: [
      { id: "dept-ece", name: "Electronics & Communication", code: "ECE", is_active: true },
      { id: "dept-chem", name: "Chemical Engineering", code: "CHEM", is_active: true },
      { id: "dept-bio", name: "Biotechnology", code: "BIO", is_active: true },
    ],
    profiles: [
      {
        id: "user-student-1",
        full_name: "Alice Student",
        email: "alice@university.edu",
        phone: "+1234567890",
        college_name: "Tech University",
        register_number: "REG-2026-001",
        is_active: true,
        is_verified: true,
        is_default_admin: false,
      },
      {
        id: "user-admin-1",
        full_name: "Admin User",
        email: "admin@university.edu",
        phone: "+1987654321",
        college_name: "Tech University",
        staff_id: "STAFF-ADM-01",
        is_active: true,
        is_verified: true,
        is_default_admin: true,
      },
      {
        id: "user-tech-1",
        full_name: "Bob Technician",
        email: "bob@university.edu",
        phone: "+1122334455",
        college_name: "Tech University",
        staff_id: "STAFF-TECH-01",
        is_active: true,
        is_verified: true,
        is_default_admin: false,
      },
    ],
    user_roles: [
      { id: "ur-1", user_id: "user-student-1", role: "student" },
      { id: "ur-2", user_id: "user-admin-1", role: "admin" },
      { id: "ur-3", user_id: "user-tech-1", role: "technician" },
    ],
    user_departments: [
      { id: "ud-1", user_id: "user-student-1", department_id: "dept-ece" },
      { id: "ud-2", user_id: "user-admin-1", department_id: "dept-ece" },
      { id: "ud-3", user_id: "user-tech-1", department_id: "dept-ece" },
    ],
    issued_items: [],
    borrow_requests: [],
    maintenance_records: [
      {
        id: "maint-rec-1",
        item_id: "44444444-4444-4444-4444-444444444444",
        assigned_to: "user-tech-1",
        status: "in_progress",
        start_date: new Date(Date.now() - 3 * 86400000).toISOString(),
        actual_completion: null,
        repair_notes: "Objective lens calibration required",
        created_at: new Date(Date.now() - 4 * 86400000).toISOString(),
      },
      {
        id: "maint-rec-2",
        item_id: "11111111-1111-1111-1111-111111111111",
        assigned_to: "user-tech-1",
        status: "completed",
        start_date: new Date(Date.now() - 10 * 86400000).toISOString(),
        actual_completion: new Date(Date.now() - 8 * 86400000).toISOString(), // 2 days
        repair_notes: "Fuse replaced",
        created_at: new Date(Date.now() - 11 * 86400000).toISOString(),
      },
      {
        id: "maint-rec-3",
        item_id: "22222222-2222-2222-2222-222222222222",
        assigned_to: "user-tech-1",
        status: "completed",
        start_date: new Date(Date.now() - 6 * 86400000).toISOString(),
        actual_completion: new Date(Date.now() - 2 * 86400000).toISOString(), // 4 days
        repair_notes: "Power supply replaced",
        created_at: new Date(Date.now() - 7 * 86400000).toISOString(),
      },
    ],
    notifications: [
      {
        id: "notif-1",
        user_id: "user-student-1",
        title: "Borrow Request Approved",
        message: "Your request for Multimeter was approved",
        notification_type: "approval",
        is_read: false,
        link: "/my-requests",
        related_entity_id: "req-123",
        related_entity_type: "borrow_request",
        created_at: new Date().toISOString(),
      },
      {
        id: "notif-2",
        user_id: "user-student-1",
        title: "Item Returned",
        message: "Multimeter was returned successfully",
        notification_type: "return",
        is_read: true,
        link: null,
        related_entity_id: "11111111-1111-1111-1111-111111111111",
        related_entity_type: "item",
        created_at: new Date(Date.now() - 86400000).toISOString(),
      },
    ],
    audit_logs: [],
    otp_verifications: [],
  };
}

export class MockSupabaseClient {
  public db: MockDatabaseState;
  public currentUser: any = null;
  public currentSession: any = null;
  private authSubscribers: ((event: string, session: any) => void)[] = [];

  constructor(initialDb?: MockDatabaseState) {
    this.db = initialDb || createInitialDbState();
    // Default logged in as student
    this.setCurrentUser("user-student-1");
  }

  public reset(initialDb?: MockDatabaseState) {
    this.db = initialDb || createInitialDbState();
    this.setCurrentUser("user-student-1");
  }

  public setCurrentUser(userId: string | null) {
    if (!userId) {
      this.currentUser = null;
      this.currentSession = null;
    } else {
      const profile = this.db.profiles.find((p) => p.id === userId);
      const roleRow = this.db.user_roles.find((r) => r.user_id === userId);
      this.currentUser = profile
        ? {
            id: profile.id,
            email: profile.email,
            user_metadata: { full_name: profile.full_name },
          }
        : null;
      this.currentSession = this.currentUser
        ? {
            user: this.currentUser,
            access_token: `token-${userId}`,
            expires_at: Math.floor(Date.now() / 1000) + 3600,
          }
        : null;
    }
    this.notifyAuthChange("SIGNED_IN", this.currentSession);
  }

  private notifyAuthChange(event: string, session: any) {
    for (const sub of this.authSubscribers) {
      sub(event, session);
    }
  }

  public get auth() {
    return {
      getSession: async () => ({
        data: { session: this.currentSession },
        error: null,
      }),
      getUser: async (token?: string) => {
        if (!token) {
          return { data: { user: this.currentUser }, error: null };
        }
        const userId = token.replace("token-", "");
        const user = this.db.profiles.find((p) => p.id === userId);
        return {
          data: {
            user: user
              ? { id: user.id, email: user.email, user_metadata: { full_name: user.full_name } }
              : null,
          },
          error: user ? null : new Error("Invalid token"),
        };
      },
      signInWithPassword: async ({ email, password }: any) => {
        const profile = this.db.profiles.find((p) => p.email === email);
        if (!profile) {
          return { data: null, error: new Error("Invalid login credentials") };
        }
        this.setCurrentUser(profile.id);
        return {
          data: { user: this.currentUser, session: this.currentSession },
          error: null,
        };
      },
      signUp: async ({ email, password, options }: any) => {
        const id = `user-${Date.now()}`;
        const newProfile = {
          id,
          email,
          full_name: options?.data?.full_name || email,
          phone: options?.data?.phone || null,
          college_name: options?.data?.college_name || null,
          register_number: options?.data?.register_number || null,
          is_active: false,
          is_verified: false,
          is_default_admin: false,
        };
        this.db.profiles.push(newProfile);
        this.db.user_roles.push({ id: `ur-${Date.now()}`, user_id: id, role: "student" });
        return {
          data: { user: { id, email }, session: null },
          error: null,
        };
      },
      signOut: async () => {
        this.setCurrentUser(null);
        return { error: null };
      },
      onAuthStateChange: (callback: (event: string, session: any) => void) => {
        this.authSubscribers.push(callback);
        return {
          data: {
            subscription: {
              unsubscribe: () => {
                this.authSubscribers = this.authSubscribers.filter((s) => s !== callback);
              },
            },
          },
        };
      },
      admin: {
        createUser: async (params: any) => {
          const id = `user-created-${Date.now()}`;
          const newProfile = {
            id,
            email: params.email,
            full_name: params.user_metadata?.full_name || params.email,
            phone: params.user_metadata?.phone || null,
            staff_id: params.user_metadata?.staff_id || null,
            is_active: true,
            is_verified: true,
            is_default_admin: false,
          };
          this.db.profiles.push(newProfile);
          this.db.user_roles.push({
            id: `ur-${Date.now()}`,
            user_id: id,
            role: params.role || "student",
          });
          return {
            data: { user: { id, email: params.email } },
            error: null,
          };
        },
        deleteUser: async (userId: string) => {
          this.db.profiles = this.db.profiles.filter((p) => p.id !== userId);
          this.db.user_roles = this.db.user_roles.filter((r) => r.user_id !== userId);
          return { data: { user: null }, error: null };
        },
      },
    };
  }

  public from(tableName: string) {
    return new MockQueryBuilder(this.db, tableName);
  }

  public async rpc(functionName: string, args: any) {
    switch (functionName) {
      case "create_otp": {
        const { p_email, p_otp } = args;
        this.db.otp_verifications.push({
          id: `otp-${Date.now()}`,
          email: p_email,
          otp_code: p_otp,
          expires_at: new Date(Date.now() + 10 * 60000).toISOString(),
          is_verified: false,
          created_at: new Date().toISOString(),
        });
        return { data: true, error: null };
      }
      case "verify_otp": {
        const { p_email, p_otp } = args;
        const record = this.db.otp_verifications.find(
          (o) => o.email === p_email && o.otp_code === p_otp && !o.is_verified
        );
        if (record) {
          record.is_verified = true;
          return { data: true, error: null };
        }
        return { data: false, error: new Error("Invalid or expired OTP") };
      }
      case "kiosk_checkout": {
        const { p_item_id, p_due_date } = args;
        if (!this.currentUser) {
          return { data: { success: false, error: "Unauthenticated" }, error: null };
        }
        const item = this.db.items.find((i) => i.id === p_item_id);
        if (!item || item.current_quantity <= 0) {
          return { data: { success: false, error: "Item out of stock" }, error: null };
        }
        item.current_quantity -= 1;
        if (item.current_quantity === 0) item.status = "borrowed";
        const issuedId = `issued-${Date.now()}`;
        this.db.issued_items.push({
          id: issuedId,
          item_id: p_item_id,
          issued_to: this.currentUser.id,
          issued_by: this.currentUser.id,
          due_date: p_due_date,
          status: "active",
        });
        return { data: { success: true, issued_item_id: issuedId }, error: null };
      }
      case "kiosk_return": {
        const { p_issued_item_id } = args;
        const issued = this.db.issued_items.find((i) => i.id === p_issued_item_id);
        if (!issued) {
          return { data: { success: false, error: "Record not found" }, error: null };
        }
        issued.status = "returned";
        issued.returned_date = new Date().toISOString();
        const item = this.db.items.find((i) => i.id === issued.item_id);
        if (item) {
          item.current_quantity += 1;
          if (item.status === "borrowed") item.status = "available";
        }
        return { data: { success: true }, error: null };
      }
      case "update_item_repair_status": {
        const { p_item_id, p_status } = args;
        const item = this.db.items.find((i) => i.id === p_item_id);
        if (!item) return { data: false, error: new Error("Item not found") };
        item.status = p_status;
        return { data: true, error: null };
      }
      default:
        return { data: null, error: new Error(`Unknown RPC function: ${functionName}`) };
    }
  }

  public functions = {
    invoke: async (functionName: string, options: any) => {
      switch (functionName) {
        case "send-email": {
          const body = options?.body || {};
          if (!body.to || !body.type) {
            return { data: { success: false, error: "Missing required fields" }, error: null };
          }
          return { data: { success: true, message: `Email sent to ${body.to}` }, error: null };
        }
        case "create-user": {
          const body = options?.body || {};
          if (!body.email || !body.password || !body.full_name) {
            return {
              data: { success: false, error: "Email, password, and full name are required" },
              error: null,
            };
          }
          const id = `user-created-${Date.now()}`;
          this.db.profiles.push({
            id,
            email: body.email,
            full_name: body.full_name,
            phone: body.phone || null,
            staff_id: body.staff_id || null,
            is_active: true,
            is_verified: true,
            is_default_admin: false,
          });
          this.db.user_roles.push({
            id: `ur-${Date.now()}`,
            user_id: id,
            role: body.role || "student",
          });
          if (body.department_id) {
            this.db.user_departments.push({
              id: `ud-${Date.now()}`,
              user_id: id,
              department_id: body.department_id,
            });
          }
          return {
            data: { success: true, user: { id, email: body.email } },
            error: null,
          };
        }
        case "delete-user": {
          const body = options?.body || {};
          const userId = body.user_id;
          const target = this.db.profiles.find((p) => p.id === userId);
          if (target?.is_default_admin) {
            return {
              data: { success: false, error: "Cannot delete the default admin account" },
              error: null,
            };
          }
          this.db.profiles = this.db.profiles.filter((p) => p.id !== userId);
          this.db.user_roles = this.db.user_roles.filter((r) => r.user_id !== userId);
          this.db.user_departments = this.db.user_departments.filter((d) => d.user_id !== userId);
          return { data: { success: true }, error: null };
        }
        default:
          return { data: { success: false, error: `Function ${functionName} not found` }, error: null };
      }
    },
  };

  public channel(channelName: string) {
    return {
      on: () => ({
        subscribe: () => ({ unsubscribe: () => {} }),
      }),
      subscribe: () => ({ unsubscribe: () => {} }),
    };
  }

  public removeChannel() {}
}

export class MockQueryBuilder {
  private db: MockDatabaseState;
  private tableName: string;
  private filters: ((row: any) => boolean)[] = [];
  private orderField?: string;
  private ascending: boolean = true;
  private limitCount?: number;
  private selectedFields: string = "*";
  private isInsert: boolean = false;
  private isUpdate: boolean = false;
  private isDelete: boolean = false;
  private mutateData: any = null;

  constructor(db: MockDatabaseState, tableName: string) {
    this.db = db;
    this.tableName = tableName;
    if (!(tableName in this.db)) {
      (this.db as any)[tableName] = [];
    }
  }

  public select(fields: string = "*") {
    this.selectedFields = fields;
    return this;
  }

  public insert(data: any) {
    this.isInsert = true;
    this.mutateData = Array.isArray(data) ? data : [data];
    return this;
  }

  public update(data: any) {
    this.isUpdate = true;
    this.mutateData = data;
    return this;
  }

  public delete() {
    this.isDelete = true;
    return this;
  }

  public eq(column: string, value: any) {
    this.filters.push((row) => row[column] === value);
    return this;
  }

  public is(column: string, value: any) {
    this.filters.push((row) => row[column] === value);
    return this;
  }

  public or(conditionString: string) {
    // E.g. "id.eq.abc,item_code.eq.abc"
    const conditions = conditionString.split(",").map((c) => {
      const parts = c.trim().split(".eq.");
      return { col: parts[0], val: parts[1] };
    });
    this.filters.push((row) => conditions.some((c) => String(row[c.col]) === String(c.val)));
    return this;
  }

  public order(field: string, options?: { ascending?: boolean }) {
    this.orderField = field;
    this.ascending = options?.ascending !== false;
    return this;
  }

  public limit(count: number) {
    this.limitCount = count;
    return this;
  }

  private execute(): any[] {
    const table: any[] = (this.db as any)[this.tableName] || [];

    if (this.isInsert) {
      const insertedRows = this.mutateData.map((item: any) => {
        const row = { id: item.id || `${this.tableName}-${Date.now()}-${Math.random()}`, ...item };
        table.push(row);
        return row;
      });
      return insertedRows;
    }

    if (this.isUpdate) {
      const updatedRows: any[] = [];
      for (const row of table) {
        if (this.filters.every((f) => f(row))) {
          Object.assign(row, this.mutateData);
          updatedRows.push(row);
        }
      }
      return updatedRows;
    }

    if (this.isDelete) {
      const kept: any[] = [];
      const deleted: any[] = [];
      for (const row of table) {
        if (this.filters.every((f) => f(row))) {
          deleted.push(row);
        } else {
          kept.push(row);
        }
      }
      (this.db as any)[this.tableName] = kept;
      return deleted;
    }

    // SELECT
    let result = table.filter((row) => this.filters.every((f) => f(row)));

    if (this.orderField) {
      const field = this.orderField;
      const asc = this.ascending ? 1 : -1;
      result = [...result].sort((a, b) => {
        if (a[field] < b[field]) return -1 * asc;
        if (a[field] > b[field]) return 1 * asc;
        return 0;
      });
    }

    if (this.limitCount !== undefined) {
      result = result.slice(0, this.limitCount);
    }

    // Attach relational mock joins if requested
    if (this.tableName === "items") {
      result = result.map((item) => ({
        ...item,
        category: this.db.categories.find((c) => c.id === item.category_id) || null,
        department: this.db.departments.find((d) => d.id === item.department_id) || null,
      }));
    } else if (this.tableName === "maintenance_records") {
      result = result.map((rec) => ({
        ...rec,
        item: this.db.items.find((i) => i.id === rec.item_id) || null,
        technician: this.db.profiles.find((p) => p.id === rec.assigned_to) || null,
      }));
    }

    return result;
  }

  public async then(resolve: (value: { data: any; error: any }) => void) {
    try {
      const data = this.execute();
      resolve({ data, error: null });
    } catch (err: any) {
      resolve({ data: null, error: err });
    }
  }

  public async single() {
    try {
      const rows = this.execute();
      if (rows.length === 0) {
        return { data: null, error: new Error("Row not found") };
      }
      return { data: rows[0], error: null };
    } catch (err: any) {
      return { data: null, error: err };
    }
  }

  public async maybeSingle() {
    try {
      const rows = this.execute();
      return { data: rows.length > 0 ? rows[0] : null, error: null };
    } catch (err: any) {
      return { data: null, error: err };
    }
  }
}
