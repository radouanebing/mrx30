using System;
using System.IO;
using System.Net.NetworkInformation;
using System.Threading.Tasks;
using System.Timers;
using System.Linq;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;
using Firebase.Database;
using Firebase.Database.Query;

namespace RadiologySyncSystem
{
    /// <summary>
    /// C# Background Sync Engine for Radiology and Hospital Sales/State tables.
    /// Handles Offline First persistence, Internet Ping tests, and 1-Minute Periodic Synchronization to Firebase Firestore.
    /// </summary>
    public class SyncService
    {
        private static Timer _syncTimer;
        private readonly HospitalDbContext _db;
        private readonly FirebaseClient _firebaseClient;
        private readonly string _storeId;
        private readonly string _firebaseToken;

        public event Action<string> OnLogMessage;
        public event Action<SyncResult> OnSyncCompleted;

        public SyncService(HospitalDbContext db, string firebaseBaseUrl, string storeId, string firebaseToken)
        {
            _db = db ?? throw new ArgumentNullException(nameof(db));
            _storeId = storeId ?? "mrx-radiology-01";
            _firebaseToken = firebaseToken;
            
            // Initialize Firebase Database Client with offline capability support
            _firebaseClient = new FirebaseClient(
                firebaseBaseUrl,
                new FirebaseOptions { AuthTokenAsyncFactory = () => Task.FromResult(_firebaseToken) }
            );

            Log("Sync Engine Initialized. Secure Token Loaded.");
        }

        /// <summary>
        /// Starts the periodic scheduling timer. Runs every 1 minute.
        /// </summary>
        public void StartScheduler()
        {
            if (_syncTimer != null) return;

            // Timer interval set to 1 minute (60,000 milliseconds)
            _syncTimer = new Timer(60000); 
            _syncTimer.Elapsed += async (sender, e) => await OnScheduleTimerElapsed();
            _syncTimer.AutoReset = true;
            _syncTimer.Start();

            Log("Periodic scheduler started. Routine check configured for every 1 minute.");
            
            // Execute an immediate initial sync assessment
            Task.Run(async () => await ExecuteSyncRoutineAsync());
        }

        /// <summary>
        /// Stops the background sync scheduler.
        /// </summary>
        public void StopScheduler()
        {
            if (_syncTimer == null) return;
            _syncTimer.Stop();
            _syncTimer.Dispose();
            _syncTimer = null;
            Log("Periodic background scheduler stopped.");
        }

        private async Task OnScheduleTimerElapsed()
        {
            Log("Scheduler ticked: Initializing internet connectivity ping check...");
            await ExecuteSyncRoutineAsync();
        }

        /// <summary>
        /// Orchestrator method that carries out connection verification and runs the sync loop
        /// </summary>
        public async Task<bool> ExecuteSyncRoutineAsync()
        {
            // Step 1: Internet Connection Assessment (Ping Test)
            bool hasConnection = PerformPingTest("8.8.8.8");

            if (!hasConnection)
            {
                Log("Warning: Connectivity test failed. Connection status: OFFLINE. Sync postponed.");
                return false;
            }

            Log("Connectivity assessment: ONLINE. Initializing StartSyncProcess...");
            try
            {
                await StartSyncProcess(_storeId);
                return true;
            }
            catch (Exception ex)
            {
                Log($"Critical Synchronizer Exception: {ex.Message}");
                return false;
            }
        }

        /// <summary>
        /// Tests network reachability by pinging an external DNS host.
        /// </summary>
        public bool PerformPingTest(string host = "8.8.8.8")
        {
            try
            {
                using (Ping ping = new Ping())
                {
                    PingReply reply = ping.Send(host, 2000); // 2-second timeout
                    return (reply != null && reply.Status == IPStatus.Success);
                }
            }
            catch
            {
                return false;
            }
        }

        /// <summary>
        /// Synchronizes unsynced data to central Firebase, referencing SyncStatus and LastModified.
        /// </summary>
        public async Task StartSyncProcess(string storeId)
        {
            Log("StartSyncProcess initiated. Inspecting changes in localized databases...");

            // Fetch list of unsynced items (SyncStatus = false)
            var unsyncedEmployees = await _db.Employees.Where(e => e.SyncStatus == false).ToListAsync();
            var unsyncedShifts = await _db.Shifts.Where(s => s.SyncStatus == false).ToListAsync();
            var unsyncedSwaps = await _db.SwapRequests.Where(r => r.SyncStatus == false).ToListAsync();

            int employeesSynced = 0;
            int shiftsSynced = 0;
            int swapsSynced = 0;

            // 1. Upload Unsynced Employees
            foreach (var emp in unsyncedEmployees)
            {
                try
                {
                    Log($"Uploading employee record {emp.Id} - Last modified {emp.LastModified}");
                    
                    await _firebaseClient
                        .Child("stores")
                        .Child(storeId)
                        .Child("employees")
                        .Child(emp.Id)
                        .PutAsync(new
                        {
                            emp.Name,
                            emp.Email,
                            emp.Phone,
                            emp.Specialty,
                            emp.Role,
                            emp.Active,
                            LastSync = DateTime.UtcNow
                        });

                    // Update local table SyncStatus the same way SQL Sales table updates
                    emp.SyncStatus = true;
                    emp.LastModified = DateTime.UtcNow; // Update LastModified
                    employeesSynced++;
                }
                catch (Exception ex)
                {
                    Log($"Error uploading employee index {emp.Id}: {ex.Message}");
                }
            }

            // 2. Upload Unsynced Shifts
            foreach (var shift in unsyncedShifts)
            {
                try
                {
                    Log($"Uploading shift record {shift.Id} - Last modified {shift.LastModified}");
                    
                    await _firebaseClient
                        .Child("stores")
                        .Child(storeId)
                        .Child("shifts")
                        .Child(shift.Id)
                        .PutAsync(new
                        {
                            shift.EmployeeId,
                            shift.Date,
                            shift.Type,
                            shift.Room,
                            shift.HoursWorked,
                            LastSync = DateTime.UtcNow
                        });

                    shift.SyncStatus = true;
                    shift.LastModified = DateTime.UtcNow;
                    shiftsSynced++;
                }
                catch (Exception ex)
                {
                    Log($"Error uploading shift index {shift.Id}: {ex.Message}");
                }
            }

            // 3. Upload Unsynced Swap Requests
            foreach (var swap in unsyncedSwaps)
            {
                try
                {
                    Log($"Uploading swap request {swap.Id} - Last modified {swap.LastModified}");
                    
                    await _firebaseClient
                        .Child("stores")
                        .Child(storeId)
                        .Child("swapRequests")
                        .Child(swap.Id)
                        .PutAsync(new
                        {
                            swap.RequesterId,
                            swap.ShiftId,
                            swap.ShiftDate,
                            swap.ShiftType,
                            swap.ProposedEmployeeId,
                            swap.Status,
                            swap.Notes,
                            LastSync = DateTime.UtcNow
                        });

                    swap.SyncStatus = true;
                    swap.LastModified = DateTime.UtcNow;
                    swapsSynced++;
                }
                catch (Exception ex)
                {
                    Log($"Error uploading swap index {swap.Id}: {ex.Message}");
                }
            }

            // Save modifications locally in database transaction
            if (employeesSynced > 0 || shiftsSynced > 0 || swapsSynced > 0)
            {
                await _db.SaveChangesAsync();
                Log($"Success: Mapped and committed changes to SQLite/SQL table state. Total synced records: {employeesSynced + shiftsSynced + swapsSynced}.");
            }
            else
            {
                Log("Analysis complete: Everything up to date. 0 elements of table state modified.");
            }

            OnSyncCompleted?.Invoke(new SyncResult
            {
                EmployeesCount = employeesSynced,
                ShiftsCount = shiftsSynced,
                SwapsCount = swapsSynced,
                Success = true
            });
        }

        private void Log(string msg)
        {
            string formatted = $"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] {msg}";
            Console.WriteLine(formatted);
            OnLogMessage?.Invoke(formatted);
        }
    }

    public class SyncResult
    {
        public int EmployeesCount { get; set; }
        public int ShiftsCount { get; set; }
        public int SwapsCount { get; set; }
        public bool Success { get; set; }
    }

    // --- Database Schema Entities (Representing local Tables with SyncStatus and LastModified columns) ---
    public class EmployeeEntity
    {
        public string Id { get; set; }
        public string Name { get; set; }
        public string Email { get; set; }
        public string Phone { get; set; }
        public string Specialty { get; set; }
        public string Role { get; set; }
        public bool Active { get; set; }
        public bool SyncStatus { get; set; } // default: false (0)
        public DateTime LastModified { get; set; } // DateTime tracking
    }

    public class ShiftEntity
    {
        public string Id { get; set; }
        public string EmployeeId { get; set; }
        public DateTime Date { get; set; }
        public string Type { get; set; }
        public string Room { get; set; }
        public int HoursWorked { get; set; }
        public bool SyncStatus { get; set; } // default: false (0)
        public DateTime LastModified { get; set; }
    }

    public class SwapRequestEntity
    {
        public string Id { get; set; }
        public string RequesterId { get; set; }
        public string ShiftId { get; set; }
        public DateTime ShiftDate { get; set; }
        public string ShiftType { get; set; }
        public string ProposedEmployeeId { get; set; }
        public string Status { get; set; }
        public string Notes { get; set; }
        public bool SyncStatus { get; set; } // default: false (0)
        public DateTime LastModified { get; set; }
    }

    public class HospitalDbContext : DbContext
    {
        public DbSet<EmployeeEntity> Employees { get; set; }
        public DbSet<ShiftEntity> Shifts { get; set; }
        public DbSet<SwapRequestEntity> SwapRequests { get; set; }
        
        protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
        {
            // Mapped to SQL Express/SQLite instance local Database connection string
            optionsBuilder.UseSqlite("Data Source=hospital_local.db");
        }
    }
}
