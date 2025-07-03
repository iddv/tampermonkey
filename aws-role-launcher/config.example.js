// Example configuration for AWS Role Launcher
// Copy this configuration and modify for your AWS accounts

const accounts = [
    {
        name: "Production Account",
        accountId: "111111111111",
        roles: [
            { name: "ReadOnly", roleName: "ReadOnlyRole" },
            { name: "PowerUser", roleName: "PowerUserRole" },
            { name: "Admin", roleName: "AdminRole" }
        ]
    },
    {
        name: "Staging Account",
        accountId: "222222222222",
        roles: [
            { name: "ReadOnly", roleName: "ReadOnlyRole" },
            { name: "Developer", roleName: "DeveloperRole" },
            { name: "Admin", roleName: "AdminRole" }
        ]
    },
    {
        name: "Development Account",
        accountId: "333333333333",
        roles: [
            { name: "Full Access", roleName: "DeveloperFullAccess" }
        ]
    },
    {
        name: "Sandbox Account",
        accountId: "444444444444",
        roles: [
            { name: "Experimenter", roleName: "ExperimenterRole" },
            { name: "Admin", roleName: "AdminRole" }
        ]
    }
];

// Usage Instructions:
// 1. Replace account IDs with your actual 12-digit AWS account IDs
// 2. Update account names to match your naming convention
// 3. Ensure role names match exactly with your IAM role names (case-sensitive)
// 4. Add or remove accounts/roles as needed
// 5. Copy this configuration into your chosen launcher file

// Common AWS Managed Policies for reference:
// - ReadOnlyAccess: arn:aws:iam::aws:policy/ReadOnlyAccess
// - PowerUserAccess: arn:aws:iam::aws:policy/PowerUserAccess
// - AdministratorAccess: arn:aws:iam::aws:policy/AdministratorAccess

// Custom role examples:
// - DeveloperRole: Custom policy with specific permissions
// - DeploymentRole: CI/CD deployment permissions
// - AuditorRole: Security and compliance read access
// - DataAnalystRole: Analytics and reporting permissions