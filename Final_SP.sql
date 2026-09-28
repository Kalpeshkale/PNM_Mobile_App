USE [DB_PNM_Testing]
GO
/****** Object:  StoredProcedure [dbo].[SP_PNM_2026_APP]    Script Date: 26-09-2026 17:12:51 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

ALTER PROC [dbo].[SP_PNM_2026_APP](@ParameterString NVARCHAR(MAX)='')
AS
BEGIN
begin try
	declare @newLogId int
	insert into [dbo].[tbl_AppLog] (Logtext,app,CreatedDate) values('SP_PNM_2026_APP>'+@ParameterString, 'PNM_APP',getdate())
	set @newLogId = @@IDENTITY


declare   
@Event varchar(max) = (select DB_Masters.dbo.GetParameterValue_CSS_Lang(@ParameterString,'Event')),
@mis_session_userid int = (select DB_Masters.dbo.GetParameterValue_CSS_Lang(@ParameterString,'mis_session_userid')),
@local_userid varchar(max) = (select DB_Masters.dbo.GetParameterValue_CSS_Lang(@ParameterString,'user_id')),
@MGuid VARCHAR(MAX)=DB_Masters.dbo.GetParameterValue_CSS_Lang(@ParameterString,'MGuid'),
@Guid VARCHAR(100)=DB_Masters.dbo.GetParameterValue_CSS_Lang(@ParameterString,'Guid'),
@AssetID INT=TRY_CAST(DB_Masters.dbo.GetParameterValue_CSS_Lang(@ParameterString,'AssetID') AS INT),
@LogID INT=TRY_CAST(DB_Masters.dbo.GetParameterValue_CSS_Lang(@ParameterString,'LogID') AS INT),
@EmpId VARCHAR(20) = DB_Masters.dbo.GetParameterValue_CSS_Lang(@ParameterString,'EmpId'),
@DateFrom DATE = TRY_CAST(DB_Masters.dbo.GetParameterValue_CSS_Lang(@ParameterString,'datefrom') AS DATE),
@DateTo DATE = TRY_CAST(DB_Masters.dbo.GetParameterValue_CSS_Lang(@ParameterString,'dateto') AS DATE),
@Today DATE=CAST(GETDATE() AS DATE),
@OperatorID INT=NULLIF(TRY_CAST(DB_Masters.dbo.GetParameterValue_CSS_Lang(@ParameterString,'OperatorID') AS INT), 0),
@Signature VARCHAR(200) = DB_Masters.dbo.GetParameterValue_CSS_Lang(@ParameterString,'Signature'),
@Timestamp VARCHAR(50) = DB_Masters.dbo.GetParameterValue_CSS_Lang(@ParameterString,'Timestamp'),
@Nonce VARCHAR(100) = DB_Masters.dbo.GetParameterValue_CSS_Lang(@ParameterString,'Nonce'),
@DeviceToken VARCHAR(200) = DB_Masters.dbo.GetParameterValue_CSS_Lang(@ParameterString,'DeviceToken');
   

DECLARE @AuthUserId   INT          = NULL;
DECLARE @AuthDeptId   INT          = NULL;
DECLARE @AuthRoleId   INT          = NULL;
DECLARE @AuthRoleName VARCHAR(100) = '';

DECLARE @StoredDeviceToken VARCHAR(200) = NULL;

IF ISNULL(@MGuid, '') <> ''
BEGIN
    SELECT TOP 1
        @AuthUserId        = u.UserId,
        @AuthDeptId        = u.DeptId,
        @AuthRoleId        = u.RoleId,
        @AuthRoleName      = ISNULL(r.Role, ''),
        @StoredDeviceToken = u.DeviceToken
    FROM dbo.tbl_User u
    LEFT JOIN dbo.mst_Role r ON r.RoleId = u.RoleId
    WHERE u.MGuid = @MGuid
      AND ISNULL(u.IsActive, 1) = 1
    ORDER BY u.UserId DESC;
END

-- Nonce/Timestamp/Signature Replay Validation (skip for login/logout)
IF @Event NOT IN ('login', 'logout') AND ISNULL(@MGuid, '') <> ''
BEGIN
    IF ISNULL(@StoredDeviceToken, '') <> ''
    BEGIN
        -- 1. Validate Timestamp (reject if older/newer than 10 minutes from UTC time)
        IF ISNULL(@Timestamp, '') = '' OR ABS(DATEDIFF(MINUTE, TRY_CAST(@Timestamp AS DATETIME2), SYSUTCDATETIME())) > 10
        BEGIN
            SELECT 'fail' AS Status, 'Request expired or invalid timestamp' AS Reasons;
            RETURN;
        END

        -- 2. Validate Nonce (must not have been used)
        IF ISNULL(@Nonce, '') = '' OR EXISTS (SELECT 1 FROM dbo.tbl_UsedNonces WHERE Nonce = @Nonce)
        BEGIN
            SELECT 'fail' AS Status, 'Duplicate or missing request nonce' AS Reasons;
            RETURN;
        END

        -- 3. Verify SHA-256 Keyed Hash Signature
        -- ExpectedSig = HASHBYTES('SHA2_256', CAST(StoredDeviceToken + '|' + Event + '|' + Timestamp + '|' + Nonce AS VARCHAR(8000)))
        DECLARE @ExpectedSig VARCHAR(200);
        SET @ExpectedSig = LOWER(CONVERT(VARCHAR(200), HASHBYTES('SHA2_256', CAST(ISNULL(@StoredDeviceToken, '') + '|' + ISNULL(@Event, '') + '|' + ISNULL(@Timestamp, '') + '|' + ISNULL(@Nonce, '') AS VARCHAR(8000))), 2));

        IF ISNULL(@Signature, '') <> @ExpectedSig
        BEGIN
            SELECT 'fail' AS Status, 'Invalid request signature' AS Reasons;
            RETURN;
        END

        -- 4. Mark Nonce as used
        INSERT INTO dbo.tbl_UsedNonces (Nonce, EmployeeID, UsedAt)
        VALUES (@Nonce, ISNULL(CAST(@AuthUserId AS VARCHAR), ''), GETDATE());
    END
END

DECLARE @ScopeDeptId INT = @AuthDeptId;
IF EXISTS (
    SELECT 1 FROM dbo.mst_Role
    WHERE RoleId = @AuthRoleId AND ISNULL(IsFullAccess, 0) = 1
)
    SET @ScopeDeptId = 0;


IF @Event = 'login'
BEGIN
    DECLARE @UserId VARCHAR(50) = DB_Masters.dbo.GetParameterValue_CSS_Lang(@ParameterString, 'UserId');
    DECLARE @Password VARCHAR(100) = DB_Masters.dbo.GetParameterValue_CSS_Lang(@ParameterString, 'Password');
    DECLARE @DeviceId VARCHAR(100) = DB_Masters.dbo.GetParameterValue_CSS_Lang(@ParameterString, 'DeviceId');
    DECLARE @DeviceModel VARCHAR(100) = DB_Masters.dbo.GetParameterValue_CSS_Lang(@ParameterString, 'DeviceModel');
    DECLARE @OsVersion VARCHAR(50) = DB_Masters.dbo.GetParameterValue_CSS_Lang(@ParameterString, 'OsVersion');
    
    DECLARE @ClientMGuid VARCHAR(MAX) = DB_Masters.dbo.GetParameterValue_CSS_Lang(@ParameterString, 'MGuid');
    IF (@ClientMGuid IS NULL OR @ClientMGuid = '')
    BEGIN
        SET @ClientMGuid = CONVERT(VARCHAR(100), NEWID());
    END
    IF NOT EXISTS (
        SELECT 1 
        FROM RohanReporting..employee_master 
        WHERE employee_id = @UserId AND employee_status = 'Active'
    )
    BEGIN
        SELECT 'fail' AS Status, 'Invalid User' AS Reasons, 'userId' AS Field;
        RETURN;
    END

    IF NOT EXISTS (
        SELECT 1 
        FROM RohanReporting..employee_master 
        WHERE employee_id = @UserId 
          AND employee_password = @Password 
          AND employee_status = 'Active'
    )
    BEGIN
        SELECT 'fail' AS Status, 'Password is wrong' AS Reasons, 'password' AS Field;
        RETURN;
    END

    IF NOT EXISTS (
        SELECT 1 
        FROM [dbo].[tbl_User] 
        WHERE EmpId = @UserId AND IsActive = 1
    )
    BEGIN
        SELECT 'fail' AS Status, 'You are not authorized to access' AS Reasons, 'unauthorized' AS Field;
        RETURN;
    END

    UPDATE [dbo].[tbl_User]
    SET IsLoggedIn = 1,
        MGuid = @ClientMGuid,
        DeviceToken = @DeviceToken
    WHERE EmpId = @UserId AND IsActive = 1;

    INSERT INTO [dbo].[tbl_LoginDetails] 
    (
        EmployeeID,
        DeviceId,
        DeviceModel,
        OsVersion,
        SessionGUID,
        DeviceToken,
        LoginDateTime,
        IsActive
    )
    VALUES
    (
        @UserId,
        @DeviceId,
        @DeviceModel,
        @OsVersion,
        @ClientMGuid,
        @DeviceToken,
        GETDATE(),
        1
    );

    SELECT 
       'success' AS Status,
       'Login successful' AS Reasons,
	    ur.UserId AS UserId,
	    ur.UserId AS OperatorID,
        ur.EmpId AS EmpId,
        ur.EmpId AS EmpID,
		d.DeptShortName AS DepartmentName,
	    r.Role AS RoleName,
        ur.Username AS EmpName,
        ur.Username AS Name,
        ur.Username AS UserName,
		ur.Email as EmpEmail,
        ur.PhotoPath AS PhotoPath,
		ur.MGuid AS MGuid
    FROM [dbo].[tbl_User] ur
    LEFT JOIN [dbo].[mst_Role] r ON r.RoleID = ur.RoleID
	LEFT JOIN [dbo].[mst_Department] d ON d.DeptId = ur.DeptId
    WHERE ur.EmpId = @UserId AND ur.IsActive = 1;
    RETURN;     
END

ELSE IF @Event = 'logout'
BEGIN
    DECLARE @LogoutUserId VARCHAR(50) = DB_Masters.dbo.GetParameterValue_CSS_Lang(@ParameterString, 'UserId');
    DECLARE @SessionMGuid VARCHAR(MAX) = DB_Masters.dbo.GetParameterValue_CSS_Lang(@ParameterString, 'MGuid');
    
    IF (@SessionMGuid IS NULL OR @SessionMGuid = '')
    BEGIN
        SET @SessionMGuid = DB_Masters.dbo.GetParameterValue_CSS_Lang(@ParameterString, 'Guid');
    END

    UPDATE [dbo].[tbl_User]
    SET IsLoggedIn = 0,
        MGuid = NULL,
        DeviceToken = NULL
    WHERE EmpId = @LogoutUserId;

    UPDATE [dbo].[tbl_LoginDetails]
    SET IsActive = 0,
        LogOutDateTime = GETDATE()
    WHERE EmployeeID = @LogoutUserId 
      AND (SessionGUID = @SessionMGuid OR IsActive = 1);
    SELECT 'success' AS Status, 'Logout successful' AS Reasons;
    RETURN;
END


ELSE IF (@Event = 'GetData')
BEGIN

    IF ISNULL(@AuthUserId, 0) = 0
    BEGIN
        RAISERROR('Unauthorized access.', 16, 1);
        RETURN;
    END



    ;WITH ActiveMount AS
    (
        SELECT
            am.MountCode,
            am.VirtualAssetId,
            am.ChassisAssetId,
            am.UpperAssetId
        FROM dbo.tbl_AssetMount am
        WHERE ISNULL(am.IsActive, 1) = 1
          AND am.UnmountedOn IS NULL
    ),
    AssetOperationalMap AS
    (
        SELECT
            a.AssetId AS BaseAssetId,
            CASE
                WHEN ISNULL(a.IsVirtualAsset, 0) = 1 THEN a.AssetId
                WHEN am.VirtualAssetId IS NOT NULL THEN am.VirtualAssetId
                ELSE a.AssetId
            END AS EffectiveAssetId
        FROM dbo.tbl_Asset a
        LEFT JOIN ActiveMount am
            ON am.ChassisAssetId = a.AssetId
            OR am.UpperAssetId   = a.AssetId
        WHERE ISNULL(a.IsActive, 1) = 1
    ),
    EffectiveAssets AS
    (
        SELECT
            ea.AssetId,
            ea.AssetCode,
            ea.AssetName,
            ea.RegistrationNo,
            ea.OwnerId,
            ea.PhotoPath,
            ea.TypeId,
            ea.SubTypeId,
            ea.ModelId,
            ea.DeptId,
            ea.IsVirtualAsset
        FROM dbo.tbl_Asset ea
        WHERE ISNULL(ea.IsActive, 1) = 1
          AND (
                ISNULL(@ScopeDeptId, 0) = 0
                OR ea.DeptId = @ScopeDeptId
              )
          AND (
                ISNULL(ea.IsVirtualAsset, 0) = 1
                OR NOT EXISTS
                (
                    SELECT 1
                    FROM ActiveMount amx
                    WHERE amx.ChassisAssetId = ea.AssetId
                       OR amx.UpperAssetId   = ea.AssetId
                )
              )
    ),
    LatestSubmitted AS
    (
        SELECT
            map.EffectiveAssetId AS AssetId,
            dl.LogId,
            dl.LogDate,
            dl.EndHMR,
            dl.EndKMR,
            dl.SubmittedOn,
            ROW_NUMBER() OVER
            (
                PARTITION BY map.EffectiveAssetId
                ORDER BY dl.LogDate DESC, dl.LogId DESC
            ) AS rn
        FROM dbo.trn_DailyLog dl
        INNER JOIN AssetOperationalMap map
            ON map.BaseAssetId = dl.AssetId
        WHERE dl.SubmissionStatus IN ('Submitted', 'Locked')
          AND dl.LogType = 'Working'
          AND ISNULL(dl.IsActive, 1) = 1
    ),
    OpenWorking AS
    (
        SELECT
            map.EffectiveAssetId AS AssetId,
            dl.LogId,
            dl.EndHMR,
            dl.EndKMR,
            dl.LogStart
        FROM dbo.trn_DailyLog dl
        INNER JOIN AssetOperationalMap map
            ON map.BaseAssetId = dl.AssetId
        WHERE dl.LogType = 'Working'
          AND dl.SubmissionStatus = 'Draft'
          AND ISNULL(dl.IsActive, 1) = 1
    ),
    OpenInterrupt AS
    (
        SELECT
            map.EffectiveAssetId AS AssetId,
            dl.LogId,
            dl.LogType,
            dl.EndHMR,
            dl.EndKMR,
            dl.LogStart
        FROM dbo.trn_DailyLog dl
        INNER JOIN AssetOperationalMap map
            ON map.BaseAssetId = dl.AssetId
        WHERE dl.LogType IN ('Breakdown', 'UnderMaintenance')
          AND dl.SubmissionStatus = 'Draft'
          AND ISNULL(dl.IsActive, 1) = 1
    ),
    ActiveProjectAsset AS
    (
        SELECT
            map.EffectiveAssetId AS AssetId,
            paa.ProjId,
            ROW_NUMBER() OVER
            (
                PARTITION BY map.EffectiveAssetId
                ORDER BY paa.ProjAssetAllocId DESC
            ) AS rn
        FROM dbo.tbl_ProjAssetAllocation paa
        INNER JOIN AssetOperationalMap map
            ON map.BaseAssetId = paa.AssetId
        INNER JOIN dbo.tbl_Project p
            ON p.ProjId = paa.ProjId
           AND ISNULL(p.IsActive, 1) = 1
        WHERE ISNULL(paa.IsActive, 1) = 1
          AND paa.ReleaseDate IS NULL
          AND (
                ISNULL(@ScopeDeptId, 0) = 0
                OR p.DeptId = @ScopeDeptId
              )
    ),
    ActiveAssetOperators AS
    (
        SELECT
            map.EffectiveAssetId AS AssetId,
            MIN(aoa.UserId)                    AS UserId,
            STRING_AGG(u.UserName, ', ')       AS OperatorName
        FROM dbo.tbl_AssetOpAllocation aoa
        INNER JOIN AssetOperationalMap map
            ON map.BaseAssetId = aoa.AssetId
        LEFT JOIN dbo.tbl_User u
            ON u.UserId = aoa.UserId
           AND ISNULL(u.IsActive, 1) = 1
        WHERE ISNULL(aoa.IsActive, 1) = 1
          AND aoa.ReleaseDate IS NULL
          AND (ISNULL(@OperatorID, 0) = 0 OR aoa.UserId = @OperatorID)
        GROUP BY map.EffectiveAssetId
    ),
    AssetAlloc AS
    (
        SELECT
            pa.AssetId,
            pa.ProjId,
            ao.UserId   AS OperatorUserId,
            ao.OperatorName
        FROM ActiveProjectAsset pa
        LEFT JOIN ActiveAssetOperators ao
            ON ao.AssetId = pa.AssetId
        WHERE pa.rn = 1
          AND (
                -- 1. If not filtering by operator, show all
                ISNULL(@OperatorID, 0) = 0
                
                 -- 2. If filtering by operator, but the caller is a Site Incharge (RoleId = 12)
                OR (
                    EXISTS (
                        SELECT 1 FROM dbo.tbl_User
                        WHERE UserId = @AuthUserId AND RoleId = 12
                    )
                    AND (
                        -- Show machines allocated to this Incharge's projects
                        pa.ProjId IN (
                            SELECT ProjId FROM dbo.tbl_ProjOpAllocation
                            WHERE UserId = @AuthUserId AND ISNULL(IsActive, 1) = 1
                        )
                        -- Or show machines directly allocated to this Incharge as operator
                        OR ao.UserId = @AuthUserId
                    )
                )
                
                -- 3. If filtering by operator and the caller is a regular Operator
                OR (
                    NOT EXISTS (
                        SELECT 1 FROM dbo.tbl_User
                        WHERE UserId = @AuthUserId AND RoleId = 12
                    )
                    AND ao.UserId = @OperatorID
                )
              )
    )
    SELECT
        a.AssetId,
        a.AssetName,
        a.RegistrationNo,
        ot.OwnerType                        AS OwnershipType,
        a.PhotoPath,
        t.TypeName                          AS AssetType,
        st.SubTypeName                      AS AssetCategory,
        p.ProjName                          AS ProjectName,
        p.Location,
        ISNULL(p.ProjName, '') + CASE
            WHEN ISNULL(p.Location, '') = '' THEN ''
            ELSE ' (' + p.Location + ')'
        END                                 AS SiteLabel,
        ISNULL(al.OperatorName, '')         AS OperatorName,

        ow.LogId                            AS WorkingLogID,
        oi.LogId                            AS InterruptionLogID,
        ISNULL(oi.LogId, ow.LogId)         AS OpenLogID,

        ISNULL(COALESCE(NULLIF(oi.EndHMR, 0), NULLIF(ow.EndHMR, 0), NULLIF(ls.EndHMR, 0)), 0) AS ReadingHMR,
        ISNULL(COALESCE(NULLIF(oi.EndKMR, 0), NULLIF(ow.EndKMR, 0), NULLIF(ls.EndKMR, 0)), 0) AS ReadingKMR,

        ISNULL(
            COALESCE(
                NULLIF(oi.EndHMR, 0), NULLIF(ow.EndHMR, 0), NULLIF(ls.EndHMR, 0),
                NULLIF(oi.EndKMR, 0), NULLIF(ow.EndKMR, 0), NULLIF(ls.EndKMR, 0)
            ), 0
        )                                   AS Reading,

        ISNULL(m.RecordingUnit, 'Hours')    AS RecordingUnit,

        CAST(
            ISNULL(
                COALESCE(
                    NULLIF(oi.EndHMR, 0), NULLIF(ow.EndHMR, 0), NULLIF(ls.EndHMR, 0),
                    NULLIF(oi.EndKMR, 0), NULLIF(ow.EndKMR, 0), NULLIF(ls.EndKMR, 0)
                ), 0
            ) AS VARCHAR(50)
        ) + ' ' + ISNULL(m.RecordingUnit, 'Hours') AS ReadingLabel,

        CASE
            WHEN oi.LogStart IS NOT NULL THEN FORMAT(oi.LogStart, 'dd-MMM h:mm tt')
            WHEN ow.LogStart IS NOT NULL THEN FORMAT(ow.LogStart, 'dd-MMM h:mm tt')
            WHEN ls.LogDate IS NULL               THEN 'No Log'
            WHEN ls.LogDate = @Today              THEN 'Today ' + FORMAT(ls.SubmittedOn, 'hh:mm tt')
            WHEN ls.LogDate = DATEADD(DAY,-1,@Today) THEN 'Yesterday ' + FORMAT(ls.SubmittedOn, 'hh:mm tt')
            ELSE FORMAT(ls.LogDate, 'dd-MMM')
        END                                 AS ReadingSince,

        CASE
            WHEN oi.LogType = 'Breakdown'         THEN 'Breakdown'
            WHEN oi.LogType = 'UnderMaintenance'  THEN 'Under Maintenance'
            WHEN ow.LogId IS NOT NULL             THEN 'Working'
            ELSE 'Idle'
        END                                 AS CurrentStatus,

        CASE WHEN ow.LogId IS NULL AND oi.LogId IS NULL THEN 1 ELSE 0 END AS ShowAddLogBtn,
        CASE WHEN ow.LogId IS NOT NULL OR oi.LogId IS NOT NULL THEN 1 ELSE 0 END AS ShowEndLogBtn

    FROM EffectiveAssets a
    LEFT JOIN dbo.mst_Type         t  ON t.TypeId  = a.TypeId
    LEFT JOIN dbo.mst_SubType      st ON st.SubTypeId = a.SubTypeId
    LEFT JOIN dbo.mst_Model    m  ON m.ModelId  = a.ModelId
    LEFT JOIN dbo.mst_OwnerType ot ON ot.OwnerId = a.OwnerId
    INNER JOIN AssetAlloc      al ON al.AssetId  = a.AssetId
    LEFT JOIN dbo.tbl_Project  p  ON p.ProjId    = al.ProjId
    LEFT JOIN LatestSubmitted  ls ON ls.AssetId  = a.AssetId AND ls.rn = 1
    LEFT JOIN OpenWorking      ow ON ow.AssetId  = a.AssetId
    LEFT JOIN OpenInterrupt    oi ON oi.AssetId  = a.AssetId
    ORDER BY a.AssetName;
END

ELSE IF (@Event = 'GetAddLogAssetDetails')
BEGIN
    IF ISNULL(@AuthUserId, 0) = 0
    BEGIN
        RAISERROR('Unauthorized access.', 16, 1);
        RETURN;
    END

    IF ISNULL(@AssetID, 0) = 0
    BEGIN
        RAISERROR('AssetID is required.', 16, 1);
        RETURN;
    END

    IF ISNULL(@ScopeDeptId, 0) <> 0
    BEGIN
        IF NOT EXISTS (
            SELECT 1
            FROM dbo.tbl_Asset a
            WHERE a.AssetId = @AssetID
              AND a.DeptId  = @ScopeDeptId
              AND ISNULL(a.IsActive, 1) = 1
        )
        BEGIN
            RAISERROR('You can view only your assigned department asset details.', 16, 1);
            RETURN;
        END
    END

    DECLARE @ProjId_D      INT = NULL;
    DECLARE @AllocId_D     INT = NULL;
    DECLARE @DefaultOpId_D INT = NULL;

    SELECT TOP 1
        @ProjId_D  = ProjId,
        @AllocId_D = ProjAssetAllocId
    FROM dbo.tbl_ProjAssetAllocation
    WHERE AssetId = @AssetID
      AND ISNULL(IsActive, 1) = 1
      AND ReleaseDate IS NULL
    ORDER BY ProjAssetAllocId DESC;

    SELECT TOP 1
        @DefaultOpId_D = UserId
    FROM dbo.tbl_AssetOpAllocation
    WHERE AssetId = @AssetID
      AND ISNULL(IsActive, 1) = 1
      AND ReleaseDate IS NULL
    ORDER BY UserId DESC;

    SELECT TOP 1
        a.AssetId,
        a.AssetName,
        ISNULL(m.RecordingUnit, 'Hours')  AS RecordingUnit,
        ISNULL(m.OutputUnit, '')          AS OutputUnit,
        ISNULL(@ProjId_D, 0)             AS ProjId,
        ISNULL(@AllocId_D, 0)            AS AllocationID,
        ISNULL(@DefaultOpId_D, 0)        AS DefaultOperatorUserId,
        GETDATE()                         AS StartDateTime,
        COALESCE(hmr.LastHMR, 0)         AS LastHMR,
        COALESCE(kmr.LastKMR, 0)         AS LastKMR
    FROM dbo.tbl_Asset a
    LEFT JOIN dbo.mst_Model m ON m.ModelId = a.ModelId
    OUTER APPLY
    (
        SELECT TOP 1
            COALESCE(NULLIF(EndHMR, 0), NULLIF(StartHMR, 0)) AS LastHMR
        FROM dbo.trn_DailyLog
        WHERE AssetId = a.AssetId
          AND LogType = 'Working'
          AND (ISNULL(StartHMR, 0) > 0 OR ISNULL(EndHMR, 0) > 0)
          AND ISNULL(IsActive, 1) = 1
        ORDER BY LogDate DESC, LogId DESC
    ) hmr
    OUTER APPLY
    (
        SELECT TOP 1
            COALESCE(NULLIF(EndKMR, 0), NULLIF(StartKMR, 0)) AS LastKMR
        FROM dbo.trn_DailyLog
        WHERE AssetId = a.AssetId
          AND LogType = 'Working'
          AND (ISNULL(StartKMR, 0) > 0 OR ISNULL(EndKMR, 0) > 0)
          AND ISNULL(IsActive, 1) = 1
        ORDER BY LogDate DESC, LogId DESC
    ) kmr
    WHERE a.AssetId = @AssetID;
END

ELSE IF (@Event = 'GetAssetOperators')
BEGIN
    IF ISNULL(@AuthUserId, 0) = 0
    BEGIN
        RAISERROR('Unauthorized access.', 16, 1);
        RETURN;
    END

    IF ISNULL(@AssetID, 0) = 0
    BEGIN
        RAISERROR('AssetID is required.', 16, 1);
        RETURN;
    END

    SELECT 
        u.UserId,
        u.UserName AS OperatorName,
        u.EmpId
    FROM dbo.tbl_AssetOpAllocation aoa
    INNER JOIN dbo.tbl_User u ON u.UserId = aoa.UserId AND ISNULL(u.IsActive, 1) = 1
    WHERE aoa.AssetId = @AssetID
      AND ISNULL(aoa.IsActive, 1) = 1
      AND aoa.ReleaseDate IS NULL
    UNION
    SELECT 
        u.UserId,
        u.UserName AS OperatorName,
        u.EmpId
    FROM dbo.tbl_User u
    WHERE u.UserId = @AuthUserId AND ISNULL(u.IsActive, 1) = 1
    ORDER BY OperatorName;
END

ELSE IF (@Event IN ('SaveAddLog', 'StartWorking'))
BEGIN
    IF ISNULL(@AuthUserId, 0) = 0
    BEGIN
        RAISERROR('Unauthorized access.', 16, 1);
        RETURN;
    END

    DECLARE @StartDateTime   DATETIME       = TRY_CAST(DB_Masters.dbo.GetParameterValue_CSS_Lang(@ParameterString, 'StartDateTime') AS DATETIME);
    DECLARE @StartHMR        DECIMAL(18,2)  = TRY_CAST(DB_Masters.dbo.GetParameterValue_CSS_Lang(@ParameterString, 'StartHMR') AS DECIMAL(18,2));
    DECLARE @StartKMR        DECIMAL(18,2)  = TRY_CAST(DB_Masters.dbo.GetParameterValue_CSS_Lang(@ParameterString, 'StartKMR') AS DECIMAL(18,2));
    DECLARE @MachineStatus   VARCHAR(100)   = DB_Masters.dbo.GetParameterValue_CSS_Lang(@ParameterString, 'MachineStatus');
    DECLARE @WorkingRemarks  VARCHAR(MAX)   = DB_Masters.dbo.GetParameterValue_CSS_Lang(@ParameterString, 'WorkingRemarks');
    DECLARE @BreakdownReason VARCHAR(MAX)   = DB_Masters.dbo.GetParameterValue_CSS_Lang(@ParameterString, 'BreakdownReason');
    DECLARE @EndReadingPhoto VARCHAR(MAX)   = DB_Masters.dbo.GetParameterValue_CSS_Lang(@ParameterString, 'EndReadingPhoto');
    DECLARE @RemarkPhoto     VARCHAR(MAX)   = DB_Masters.dbo.GetParameterValue_CSS_Lang(@ParameterString, 'RemarkPhoto');
    DECLARE @EndDateTime     DATETIME       = TRY_CAST(DB_Masters.dbo.GetParameterValue_CSS_Lang(@ParameterString, 'EndDateTime') AS DATETIME);
    DECLARE @EndHMR          DECIMAL(18,2)  = TRY_CAST(DB_Masters.dbo.GetParameterValue_CSS_Lang(@ParameterString, 'EndHMR') AS DECIMAL(18,2));
    DECLARE @EndKMR          DECIMAL(18,2)  = TRY_CAST(DB_Masters.dbo.GetParameterValue_CSS_Lang(@ParameterString, 'EndKMR') AS DECIMAL(18,2));
    DECLARE @OutputQty       DECIMAL(18,2)  = TRY_CAST(DB_Masters.dbo.GetParameterValue_CSS_Lang(@ParameterString, 'OutputQty') AS DECIMAL(18,2));

    DECLARE @EffectiveAssetId INT;
    SELECT
        @EffectiveAssetId =
            CASE
                WHEN ISNULL(a.IsVirtualAsset, 0) = 1 THEN a.AssetId
                WHEN EXISTS (
                    SELECT 1
                    FROM dbo.tbl_AssetMount am
                    WHERE ISNULL(am.IsActive, 1) = 1
                      AND am.UnmountedOn IS NULL
                      AND (am.ChassisAssetId = a.AssetId OR am.UpperAssetId = a.AssetId)
                )
                THEN (
                    SELECT TOP 1 am.VirtualAssetId
                    FROM dbo.tbl_AssetMount am
                    WHERE ISNULL(am.IsActive, 1) = 1
                      AND am.UnmountedOn IS NULL
                      AND (am.ChassisAssetId = a.AssetId OR am.UpperAssetId = a.AssetId)
                    ORDER BY am.MountId DESC
                )
                ELSE a.AssetId
            END
    FROM dbo.tbl_Asset a
    WHERE a.AssetId = @AssetID
      AND ISNULL(a.IsActive, 1) = 1;

    SET @AssetID = ISNULL(@EffectiveAssetId, @AssetID);

    IF ISNULL(@AssetID, 0) = 0
    BEGIN
        RAISERROR('AssetID is required.', 16, 1);
        RETURN;
    END

    IF @StartDateTime IS NULL
    BEGIN
        RAISERROR('StartDateTime is required.', 16, 1);
        RETURN;
    END

    DECLARE @ProjId INT = NULL;
    DECLARE @AllocId INT = NULL;
    SELECT TOP 1
        @ProjId = ProjId,
        @AllocId = ProjAssetAllocId
    FROM dbo.tbl_ProjAssetAllocation
    WHERE AssetId = @AssetID
      AND ISNULL(IsActive, 1) = 1
      AND ReleaseDate IS NULL
    ORDER BY ProjAssetAllocId DESC;

    IF ISNULL(@ProjId, 0) = 0
    BEGIN
        RAISERROR('Project allocation not found for this asset.', 16, 1);
        RETURN;
    END

    IF ISNULL(@OperatorID, 0) = 0
    BEGIN
        SELECT TOP 1
            @OperatorID = UserId
        FROM dbo.tbl_AssetOpAllocation
        WHERE AssetId = @AssetID
          AND ISNULL(IsActive, 1) = 1
          AND ReleaseDate IS NULL
        ORDER BY CreatedOn DESC;
    END

    IF ISNULL(@OperatorID, 0) = 0
    BEGIN
        RAISERROR('OperatorID is required.', 16, 1);
        RETURN;
    END

    IF ISNULL(@ScopeDeptId, 0) <> 0
    BEGIN
        IF NOT EXISTS (
            SELECT 1
            FROM dbo.tbl_Asset a
            WHERE a.AssetId = @AssetID
              AND a.DeptId = @ScopeDeptId
              AND ISNULL(a.IsActive, 1) = 1
        )
        BEGIN
            RAISERROR('You can add logs only for assets in your assigned department.', 16, 1);
            RETURN;
        END
    END

    IF LTRIM(RTRIM(ISNULL(@AuthRoleName, ''))) = 'Operator'
    BEGIN
        IF @OperatorID <> @AuthUserId
        BEGIN
            RAISERROR('Operator can add logs only for their own profile.', 16, 1);
            RETURN;
        END
    END
    IF @StartHMR IS NULL AND @StartKMR IS NULL
    BEGIN
        RAISERROR('Either Start HMR or Start KMR is required.', 16, 1);
        RETURN;
    END

    IF EXISTS (
        SELECT 1
        FROM dbo.trn_DailyLog
        WHERE AssetId = @AssetID
          AND SubmissionStatus = 'Draft'
          AND ISNULL(IsActive, 1) = 1
    )
    BEGIN
        RAISERROR('One draft log is already open for this asset.', 16, 1);
        RETURN;
    END

    DECLARE @LastEndHMR DECIMAL(18,2);
    DECLARE @LastEndKMR DECIMAL(18,2);

    SELECT TOP 1
        @LastEndHMR = EndHMR,
        @LastEndKMR = EndKMR
    FROM dbo.trn_DailyLog
    WHERE AssetId = @AssetID
      AND LogType = 'Working'
      AND ISNULL(IsActive, 1) = 1
    ORDER BY LogDate DESC, LogId DESC;

    IF ISNULL(@StartHMR, 0) > 0 AND @LastEndHMR IS NOT NULL AND @StartHMR < @LastEndHMR
    BEGIN
        RAISERROR('Start HMR cannot be less than last End HMR.', 16, 1);
        RETURN;
    END

    IF ISNULL(@StartKMR, 0) > 0 AND @LastEndKMR IS NOT NULL AND @StartKMR < @LastEndKMR
    BEGIN
        RAISERROR('Start KMR cannot be less than last End KMR.', 16, 1);
        RETURN;
    END

    IF CONVERT(DATE, ISNULL(@EndDateTime, '1900-01-01')) = '1900-01-01'
        SET @EndDateTime = NULL;

    IF ISNULL(@EndHMR, 0) = 0
        SET @EndHMR = NULL;

    IF ISNULL(@EndKMR, 0) = 0
        SET @EndKMR = NULL;

    IF @EndHMR IS NOT NULL AND @EndHMR < @StartHMR
    BEGIN
        RAISERROR('End HMR cannot be less than Start HMR.', 16, 1);
        RETURN;
    END

    IF @EndKMR IS NOT NULL AND @EndKMR < @StartKMR
    BEGIN
        RAISERROR('End KMR cannot be less than Start KMR.', 16, 1);
        RETURN;
    END

    IF @EndDateTime IS NOT NULL AND @EndDateTime < @StartDateTime
    BEGIN
        RAISERROR('End Date Time cannot be less than Start Date Time.', 16, 1);
        RETURN;
    END

    SET @MachineStatus = ISNULL(NULLIF(@MachineStatus, ''), 'Working');

    INSERT INTO dbo.trn_DailyLog
    (
        UniqueId,
        LogDate,
        ProjId,
        AssetId,
        UserId,
        MachineStatus,
        LogType,
        LogStart,
        LogEnd,
        StartHMR,
        EndHMR,
        StartKMR,
        EndKMR,
        ProductionQty,
        WorkingHours,
        IsActive,
        SubmissionStatus,
        OperatorRemarks,
        CreatedBy,
        CreatedOn,
        EndHMRPhoto,
        EndKMRPhoto,
        RemarkPhotoPath,
        BreakdownReason
    )
    VALUES
    (
        SUBSTRING(CONVERT(VARCHAR(50), NEWID()), 1, 8),
        CAST(@StartDateTime AS DATE),
        @ProjId,
        @AssetID,
        @OperatorID,
        @MachineStatus,
        'Working',
        @StartDateTime,
        @EndDateTime,
        ISNULL(@StartHMR, 0),
        ISNULL(@EndHMR, ISNULL(@StartHMR, 0)),
        ISNULL(@StartKMR, 0),
        ISNULL(@EndKMR, ISNULL(@StartKMR, 0)),
        ISNULL(@OutputQty, 0),
        CASE 
            WHEN @EndDateTime IS NOT NULL AND @StartDateTime IS NOT NULL 
                THEN DATEDIFF(MINUTE, @StartDateTime, @EndDateTime) / 60.0 
            ELSE 0 
        END,
        1,
        'Draft',
        @WorkingRemarks,
        @AuthUserId,
        GETDATE(),
        NULLIF(@EndReadingPhoto, ''),
        NULLIF(@EndReadingPhoto, ''),
        NULLIF(@RemarkPhoto, ''),
        ISNULL(@BreakdownReason, '')
    );

    SELECT
        'Success' AS Status,
        'Add log saved successfully.' AS Msg,
        SCOPE_IDENTITY() AS LogID;
END

ELSE IF (@Event = 'EndWorking')
BEGIN
    IF ISNULL(@AuthUserId, 0) = 0
    BEGIN
        RAISERROR('Unauthorized access.', 16, 1);
        RETURN;
    END

    IF ISNULL(@LogID, 0) = 0
    BEGIN
        RAISERROR('LogID is required.', 16, 1);
        RETURN;
    END

    DECLARE @EndDateTime_E     DATETIME      = TRY_CAST(DB_Masters.dbo.GetParameterValue_CSS_Lang(@ParameterString, 'EndDateTime') AS DATETIME);
    DECLARE @EndHMR_E          DECIMAL(18,2) = TRY_CAST(DB_Masters.dbo.GetParameterValue_CSS_Lang(@ParameterString, 'EndHMR') AS DECIMAL(18,2));
    DECLARE @EndKMR_E          DECIMAL(18,2) = TRY_CAST(DB_Masters.dbo.GetParameterValue_CSS_Lang(@ParameterString, 'EndKMR') AS DECIMAL(18,2));
    DECLARE @ProductionQty_E   DECIMAL(18,2) = TRY_CAST(DB_Masters.dbo.GetParameterValue_CSS_Lang(@ParameterString, 'ProductionQty') AS DECIMAL(18,2));
    DECLARE @WorkingRemarks_E  VARCHAR(MAX)  = DB_Masters.dbo.GetParameterValue_CSS_Lang(@ParameterString, 'WorkingRemarks');
    DECLARE @EndReadingPhoto_E VARCHAR(MAX)  = DB_Masters.dbo.GetParameterValue_CSS_Lang(@ParameterString, 'EndReadingPhoto');
    DECLARE @RemarkPhoto_E     VARCHAR(MAX)  = DB_Masters.dbo.GetParameterValue_CSS_Lang(@ParameterString, 'RemarkPhoto');
    DECLARE @MachineStatus_E   VARCHAR(100)  = DB_Masters.dbo.GetParameterValue_CSS_Lang(@ParameterString, 'MachineStatus');

    IF @EndDateTime_E IS NULL
    BEGIN
        RAISERROR('EndDateTime is required.', 16, 1);
        RETURN;
    END

    DECLARE @StartHMR_E DECIMAL(18,2);
    DECLARE @StartKMR_E DECIMAL(18,2);
    DECLARE @LogStart_E DATETIME;
    DECLARE @AssetID_E  INT;
    DECLARE @UserId_E   INT;

    SELECT
        @StartHMR_E = StartHMR,
        @StartKMR_E = StartKMR,
        @LogStart_E = LogStart,
        @AssetID_E  = AssetId,
        @UserId_E   = UserId
    FROM dbo.trn_DailyLog
    WHERE LogId = @LogID
      AND SubmissionStatus = 'Draft'
      AND ISNULL(IsActive, 1) = 1;

    IF @LogStart_E IS NULL
    BEGIN
        RAISERROR('Draft log not found.', 16, 1);
        RETURN;
    END

    IF LTRIM(RTRIM(ISNULL(@AuthRoleName, ''))) = 'Operator'
    BEGIN
        IF @UserId_E <> @AuthUserId
        BEGIN
            RAISERROR('Only own log can close the Operator.', 16, 1);
            RETURN;
        END
    END

    IF ISNULL(@ScopeDeptId, 0) <> 0
    BEGIN
        IF NOT EXISTS (
            SELECT 1
            FROM dbo.tbl_Asset a
            WHERE a.AssetId = @AssetID_E
              AND a.DeptId = @ScopeDeptId
              AND ISNULL(a.IsActive, 1) = 1
        )
        BEGIN
            RAISERROR('You can only modify logs for assets in your assigned department.', 16, 1);
            RETURN;
        END
    END

    IF @EndHMR_E IS NOT NULL AND @StartHMR_E IS NOT NULL AND @EndHMR_E < @StartHMR_E
    BEGIN
        RAISERROR('End HMR cannot be less than Start HMR.', 16, 1);
        RETURN;
    END

    IF @EndKMR_E IS NOT NULL AND @StartKMR_E IS NOT NULL AND @EndKMR_E < @StartKMR_E
    BEGIN
        RAISERROR('End KMR cannot be less than Start KMR.', 16, 1);
        RETURN;
    END

    IF @EndDateTime_E < @LogStart_E
    BEGIN
        RAISERROR('EndDateTime cannot be less than LogStart.', 16, 1);
        RETURN;
    END

    UPDATE dbo.trn_DailyLog
    SET
        EndHMR = ISNULL(@EndHMR_E, StartHMR),
        EndKMR = ISNULL(@EndKMR_E, StartKMR),
        MachineStatus = ISNULL(NULLIF(@MachineStatus_E, ''), MachineStatus),
        ProductionQty = ISNULL(@ProductionQty_E, 0),
        OperatorRemarks = ISNULL(@WorkingRemarks_E, OperatorRemarks),
        EndHMRPhoto = ISNULL(NULLIF(@EndReadingPhoto_E, ''), EndHMRPhoto),
        EndKMRPhoto = ISNULL(NULLIF(@EndReadingPhoto_E, ''), EndHMRPhoto),
        RemarkPhotoPath = ISNULL(NULLIF(@RemarkPhoto_E, ''), RemarkPhotoPath),
        SubmissionStatus = 'Submitted',
        SubmittedBy = @AuthUserId,
        SubmittedOn = GETDATE(),
        LogEnd = @EndDateTime_E,
        WorkingHours = DATEDIFF(MINUTE, LogStart, @EndDateTime_E) / 60.0,
        ModifiedBy = @AuthUserId,
        ModifiedOn = GETDATE()
    WHERE LogId = @LogID
      AND SubmissionStatus = 'Draft';

    SELECT
        'Success' AS Status,
        'End log submitted successfully.' AS Msg,
        @LogID AS LogID;
END

ELSE IF (@Event IN ('StartBreakdown', 'StartUnderMaintenance'))
BEGIN
    IF ISNULL(@AuthUserId, 0) = 0
    BEGIN
        RAISERROR('Unauthorized access.', 16, 1);
        RETURN;
    END

    DECLARE @StartDateTime_I   DATETIME       = TRY_CAST(DB_Masters.dbo.GetParameterValue_CSS_Lang(@ParameterString, 'StartDateTime') AS DATETIME);
    DECLARE @StartHMR_I        DECIMAL(18,2)  = TRY_CAST(DB_Masters.dbo.GetParameterValue_CSS_Lang(@ParameterString, 'StartHMR') AS DECIMAL(18,2));
    DECLARE @StartKMR_I        DECIMAL(18,2)  = TRY_CAST(DB_Masters.dbo.GetParameterValue_CSS_Lang(@ParameterString, 'StartKMR') AS DECIMAL(18,2));
    DECLARE @WorkingRemarks_I  VARCHAR(MAX)   = DB_Masters.dbo.GetParameterValue_CSS_Lang(@ParameterString, 'WorkingRemarks');
    DECLARE @BreakdownReason_I VARCHAR(MAX)   = DB_Masters.dbo.GetParameterValue_CSS_Lang(@ParameterString, 'BreakdownReason');
    DECLARE @RemarkPhoto_I     VARCHAR(MAX)   = DB_Masters.dbo.GetParameterValue_CSS_Lang(@ParameterString, 'RemarkPhoto');

    DECLARE @EffectiveAssetId_I INT;
    SELECT
        @EffectiveAssetId_I =
            CASE
                WHEN ISNULL(a.IsVirtualAsset, 0) = 1 THEN a.AssetId
                WHEN EXISTS (
                    SELECT 1
                    FROM dbo.tbl_AssetMount am
                    WHERE ISNULL(am.IsActive, 1) = 1
                      AND am.UnmountedOn IS NULL
                      AND (am.ChassisAssetId = a.AssetId OR am.UpperAssetId = a.AssetId)
                )
                THEN (
                    SELECT TOP 1 am.VirtualAssetId
                    FROM dbo.tbl_AssetMount am
                    WHERE ISNULL(am.IsActive, 1) = 1
                      AND am.UnmountedOn IS NULL
                      AND (am.ChassisAssetId = a.AssetId OR am.UpperAssetId = a.AssetId)
                    ORDER BY am.MountId DESC
                )
                ELSE a.AssetId
            END
    FROM dbo.tbl_Asset a
    WHERE a.AssetId = @AssetID
      AND ISNULL(a.IsActive, 1) = 1;

    SET @AssetID = ISNULL(@EffectiveAssetId_I, @AssetID);

    IF ISNULL(@AssetID, 0) = 0
    BEGIN
        RAISERROR('AssetID is required.', 16, 1);
        RETURN;
    END

    IF @StartDateTime_I IS NULL
    BEGIN
        RAISERROR('StartDateTime is required.', 16, 1);
        RETURN;
    END

    DECLARE @ChildStatus VARCHAR(30) = CASE WHEN @Event = 'StartBreakdown' THEN 'Breakdown' ELSE 'UnderMaintenance' END;
    DECLARE @ProjId_I INT = NULL;
    DECLARE @OperatorId_I INT = NULL;
    DECLARE @ParentStartDateTime DATETIME = NULL;

    SELECT TOP 1
        @ProjId_I = ProjId,
        @OperatorId_I = UserId,
        @ParentStartDateTime = LogStart,
        @StartHMR_I = ISNULL(@StartHMR_I, StartHMR),
        @StartKMR_I = ISNULL(@StartKMR_I, StartKMR)
    FROM dbo.trn_DailyLog
    WHERE AssetId = @AssetID
      AND LogType = 'Working'
      AND SubmissionStatus = 'Draft'
      AND ISNULL(IsActive, 1) = 1
    ORDER BY LogId DESC;

    IF ISNULL(@ProjId_I, 0) = 0
    BEGIN
        SELECT TOP 1
            @ProjId_I = ProjId
        FROM dbo.tbl_ProjAssetAllocation
        WHERE AssetId = @AssetID
          AND ISNULL(IsActive, 1) = 1
          AND ReleaseDate IS NULL
        ORDER BY ProjAssetAllocId DESC;
    END

    IF ISNULL(@OperatorId_I, 0) = 0
    BEGIN
        SELECT TOP 1
            @OperatorId_I = UserId
        FROM dbo.tbl_AssetOpAllocation
        WHERE AssetId = @AssetID
          AND ISNULL(IsActive, 1) = 1
          AND ReleaseDate IS NULL
        ORDER BY UserId DESC;
    END

    IF ISNULL(@ProjId_I, 0) = 0
    BEGIN
        RAISERROR('ProjectID not found for this asset.', 16, 1);
        RETURN;
    END

    IF ISNULL(@OperatorId_I, 0) = 0
    BEGIN
        RAISERROR('OperatorID is required.', 16, 1);
        RETURN;
    END

    IF @ParentStartDateTime IS NOT NULL AND @StartDateTime_I < @ParentStartDateTime
    BEGIN
        RAISERROR('Interruption start time cannot be less than working start time.', 16, 1);
        RETURN;
    END

    IF ISNULL(@ScopeDeptId, 0) <> 0
    BEGIN
        IF NOT EXISTS (
            SELECT 1
            FROM dbo.tbl_Asset a
            WHERE a.AssetId = @AssetID
              AND a.DeptId = @ScopeDeptId
              AND ISNULL(a.IsActive, 1) = 1
        )
        BEGIN
            RAISERROR('You can start interruption logs only for your assigned department assets.', 16, 1);
            RETURN;
        END
    END

    IF LTRIM(RTRIM(ISNULL(@AuthRoleName, ''))) = 'Operator'
    BEGIN
        IF @OperatorId_I <> @AuthUserId
        BEGIN
            RAISERROR('Operator can start interruption logs only for their own profile.', 16, 1);
            RETURN;
        END
    END

    IF EXISTS (
        SELECT 1
        FROM dbo.trn_DailyLog
        WHERE AssetId = @AssetID
          AND LogType IN ('Breakdown', 'UnderMaintenance')
          AND SubmissionStatus = 'Draft'
          AND ISNULL(IsActive, 1) = 1
    )
    BEGIN
        RAISERROR('Another interruption log is already open for this asset.', 16, 1);
        RETURN;
    END

    INSERT INTO dbo.trn_DailyLog
    (
        UniqueId,
        LogDate,
        ProjId,
        AssetId,
        UserId,
        StartHMR,
        EndHMR,
        StartKMR,
        EndKMR,
        MachineStatus,
        ProductionQty,
        SubmissionStatus,
        OperatorRemarks,
        CreatedBy,
        CreatedOn,
        LogStart,
        LogType,
        RemarkPhotoPath,
        BreakdownReason,
        MaintainceReason
    )
    VALUES
    (
        SUBSTRING(CONVERT(VARCHAR(50), NEWID()), 1, 8),
        CAST(@StartDateTime_I AS DATE),
        @ProjId_I,
        @AssetID,
        @OperatorId_I,
        ISNULL(@StartHMR_I, 0),
        ISNULL(@StartHMR_I, 0),
        ISNULL(@StartKMR_I, 0),
        ISNULL(@StartKMR_I, 0),
        @ChildStatus,
        0,
        'Draft',
        @WorkingRemarks_I,
        @AuthUserId,
        GETDATE(),
        @StartDateTime_I,
        @ChildStatus,
        NULLIF(@RemarkPhoto_I, ''),
        CASE WHEN @ChildStatus = 'Breakdown' THEN ISNULL(@BreakdownReason_I, '') ELSE '' END,
        CASE WHEN @ChildStatus = 'UnderMaintenance' THEN ISNULL(@BreakdownReason_I, '') ELSE '' END
    );

    SELECT 'Success' AS Status, @ChildStatus + ' started successfully.' AS Msg, SCOPE_IDENTITY() AS LogID;
END

ELSE IF (@Event = 'GetEndLogDetails')
BEGIN
    IF ISNULL(@AuthUserId, 0) = 0
    BEGIN
        RAISERROR('Unauthorized access.', 16, 1);
        RETURN;
    END

    IF ISNULL(@LogID, 0) = 0
    BEGIN
        RAISERROR('LogID is required.', 16, 1);
        RETURN;
    END

    IF NOT EXISTS (
        SELECT 1
        FROM dbo.trn_DailyLog
        WHERE LogId = @LogID
          AND SubmissionStatus = 'Draft'
    )
    BEGIN
        RAISERROR('Draft log not found.', 16, 1);
        RETURN;
    END

    SELECT
        dl.LogId            AS LogID,
        dl.LogDate,
        dl.ProjId           AS ProjectID,
        dl.AssetId          AS AssetID,
        dl.UserId           AS OperatorID,
        a.AssetName,
        ISNULL(m.RecordingUnit, 'Hours') AS RecordingUnit,
        ISNULL(m.OutputUnit, '') AS OutputUnit,
        dl.StartHMR,
        dl.EndHMR,
        dl.StartKMR,
        dl.EndKMR,
        dl.MachineStatus,
        dl.ProductionQty,
        CAST(0 AS DECIMAL(18,2)) AS IdleHours,
        CAST(0 AS DECIMAL(18,2)) AS BreakdownHours,
        dl.BreakdownReason,
        dl.OperatorRemarks  AS Remarks,
        dl.RemarkPhotoPath  AS RemarkPhoto,
        dl.EndHMRPhoto      AS EndReadingPhoto,
        dl.SubmissionStatus,
        dl.LogStart         AS StartDateTime,
        dl.LogEnd           AS EndDateTime
    FROM dbo.trn_DailyLog dl
    JOIN dbo.tbl_Asset a
        ON a.AssetId = dl.AssetId
    LEFT JOIN dbo.mst_Model m
        ON m.ModelId = a.ModelId
    WHERE dl.LogId = @LogID
      AND dl.SubmissionStatus = 'Draft';
END

ELSE IF (@Event = 'EndUnderMaintenance')
BEGIN
    IF ISNULL(@AuthUserId, 0) = 0
    BEGIN
        RAISERROR('Unauthorized access.', 16, 1);
        RETURN;
    END

    IF ISNULL(@LogID, 0) = 0
    BEGIN
        RAISERROR('LogID is required.', 16, 1);
        RETURN;
    END

    DECLARE @EndDateTime_M     DATETIME      = TRY_CAST(DB_Masters.dbo.GetParameterValue_CSS_Lang(@ParameterString, 'EndDateTime') AS DATETIME);
    DECLARE @EndHMR_M          DECIMAL(18,2) = TRY_CAST(DB_Masters.dbo.GetParameterValue_CSS_Lang(@ParameterString, 'EndHMR') AS DECIMAL(18,2));
    DECLARE @EndKMR_M          DECIMAL(18,2) = TRY_CAST(DB_Masters.dbo.GetParameterValue_CSS_Lang(@ParameterString, 'EndKMR') AS DECIMAL(18,2));
    DECLARE @WorkingRemarks_M  VARCHAR(MAX)  = DB_Masters.dbo.GetParameterValue_CSS_Lang(@ParameterString, 'WorkingRemarks');
    DECLARE @BreakdownReason_M VARCHAR(MAX)  = DB_Masters.dbo.GetParameterValue_CSS_Lang(@ParameterString, 'BreakdownReason');
    DECLARE @EndReadingPhoto_M VARCHAR(MAX)  = DB_Masters.dbo.GetParameterValue_CSS_Lang(@ParameterString, 'EndReadingPhoto');
    DECLARE @RemarkPhoto_M     VARCHAR(MAX)  = DB_Masters.dbo.GetParameterValue_CSS_Lang(@ParameterString, 'RemarkPhoto');

    IF @EndDateTime_M IS NULL
    BEGIN
        RAISERROR('EndDateTime is required.', 16, 1);
        RETURN;
    END

    DECLARE @AssetId_M                  INT;
    DECLARE @ProjId_M                   INT;
    DECLARE @OperatorId_M               INT;
    DECLARE @MaintStartDateTime         DATETIME;
    DECLARE @StartHMR_M                 DECIMAL(18,2);
    DECLARE @StartKMR_M                 DECIMAL(18,2);

    SELECT
        @AssetId_M          = dl.AssetId,
        @ProjId_M           = dl.ProjId,
        @OperatorId_M       = dl.UserId,
        @MaintStartDateTime = dl.LogStart,
        @StartHMR_M         = dl.StartHMR,
        @StartKMR_M         = dl.StartKMR
    FROM dbo.trn_DailyLog dl
    WHERE dl.LogId = @LogID
      AND dl.LogType = 'UnderMaintenance'
      AND dl.SubmissionStatus = 'Draft'
      AND ISNULL(dl.IsActive, 1) = 1;

    IF @AssetId_M IS NULL
    BEGIN
        RAISERROR('Active Under Maintenance log not found.', 16, 1);
        RETURN;
    END

    IF ISNULL(@ScopeDeptId, 0) <> 0
    BEGIN
        IF NOT EXISTS (
            SELECT 1
            FROM dbo.tbl_Asset a
            WHERE a.AssetId = @AssetId_M
              AND a.DeptId = @ScopeDeptId
              AND ISNULL(a.IsActive, 1) = 1
        )
        BEGIN
            RAISERROR('You can only modify logs for assets in your assigned department.', 16, 1);
            RETURN;
        END
    END

    IF LTRIM(RTRIM(ISNULL(@AuthRoleName, ''))) = 'Operator'
    BEGIN
        IF @OperatorId_M <> @AuthUserId
        BEGIN
            RAISERROR('Operator can end maintenance only for their own profile.', 16, 1);
            RETURN;
        END
    END

    IF @EndHMR_M IS NOT NULL AND @StartHMR_M IS NOT NULL AND @EndHMR_M < @StartHMR_M
    BEGIN
        RAISERROR('End HMR cannot be less than Start HMR.', 16, 1);
        RETURN;
    END

    IF @EndKMR_M IS NOT NULL AND @StartKMR_M IS NOT NULL AND @EndKMR_M < @StartKMR_M
    BEGIN
        RAISERROR('End KMR cannot be less than Start KMR.', 16, 1);
        RETURN;
    END

    IF @EndDateTime_M < @MaintStartDateTime
    BEGIN
        RAISERROR('EndDateTime cannot be less than LogStart.', 16, 1);
        RETURN;
    END

    UPDATE dbo.trn_DailyLog
    SET
        EndHMR = ISNULL(@EndHMR_M, StartHMR),
        EndKMR = ISNULL(@EndKMR_M, StartKMR),
        LogEnd = @EndDateTime_M,
        OperatorRemarks = ISNULL(@WorkingRemarks_M, OperatorRemarks),
        MaintainceReason = ISNULL(@BreakdownReason_M, MaintainceReason),
        EndHMRPhoto = ISNULL(NULLIF(@EndReadingPhoto_M, ''), EndHMRPhoto),
        EndKMRPhoto = ISNULL(NULLIF(@EndReadingPhoto_M, ''), EndKMRPhoto),
        RemarkPhotoPath = ISNULL(NULLIF(@RemarkPhoto_M, ''), RemarkPhotoPath),
        MaintainacePhotoPath = ISNULL(NULLIF(@EndReadingPhoto_M, ''), MaintainacePhotoPath),
        SubmissionStatus = 'Submitted',
        SubmittedBy = @AuthUserId,
        SubmittedOn = GETDATE(),
        WorkingHours = DATEDIFF(MINUTE, LogStart, @EndDateTime_M) / 60.0,
        ModifiedBy = @AuthUserId,
        ModifiedOn = GETDATE()
    WHERE LogId = @LogID
      AND SubmissionStatus = 'Draft';

    SELECT
        'Success' AS Status,
        'Under Maintenance ended successfully.' AS Msg,
        @LogID AS LogID;
END

ELSE IF (@Event = 'EndBreakdown')
BEGIN
    IF ISNULL(@AuthUserId, 0) = 0
    BEGIN
        RAISERROR('Unauthorized access.', 16, 1);
        RETURN;
    END

    IF ISNULL(@LogID, 0) = 0
    BEGIN
        RAISERROR('LogID is required.', 16, 1);
        RETURN;
    END

    DECLARE @EndDateTime_B     DATETIME      = TRY_CAST(DB_Masters.dbo.GetParameterValue_CSS_Lang(@ParameterString, 'EndDateTime') AS DATETIME);
    DECLARE @EndHMR_B          DECIMAL(18,2) = TRY_CAST(DB_Masters.dbo.GetParameterValue_CSS_Lang(@ParameterString, 'EndHMR') AS DECIMAL(18,2));
    DECLARE @EndKMR_B          DECIMAL(18,2) = TRY_CAST(DB_Masters.dbo.GetParameterValue_CSS_Lang(@ParameterString, 'EndKMR') AS DECIMAL(18,2));
    DECLARE @WorkingRemarks_B  VARCHAR(MAX)  = DB_Masters.dbo.GetParameterValue_CSS_Lang(@ParameterString, 'WorkingRemarks');
    DECLARE @BreakdownReason_B VARCHAR(MAX)  = DB_Masters.dbo.GetParameterValue_CSS_Lang(@ParameterString, 'BreakdownReason');
    DECLARE @EndReadingPhoto_B VARCHAR(MAX)  = DB_Masters.dbo.GetParameterValue_CSS_Lang(@ParameterString, 'EndReadingPhoto');
    DECLARE @RemarkPhoto_B     VARCHAR(MAX)  = DB_Masters.dbo.GetParameterValue_CSS_Lang(@ParameterString, 'RemarkPhoto');

    IF @EndDateTime_B IS NULL
    BEGIN
        RAISERROR('EndDateTime is required.', 16, 1);
        RETURN;
    END

    DECLARE @AssetId_B                  INT;
    DECLARE @ProjId_B                   INT;
    DECLARE @OperatorId_B               INT;
    DECLARE @BreakdownStartDateTime     DATETIME;
    DECLARE @StartHMR_B                 DECIMAL(18,2);
    DECLARE @StartKMR_B                 DECIMAL(18,2);

    SELECT
        @AssetId_B              = dl.AssetId,
        @ProjId_B               = dl.ProjId,
        @OperatorId_B           = dl.UserId,
        @BreakdownStartDateTime = dl.LogStart,
        @StartHMR_B             = dl.StartHMR,
        @StartKMR_B             = dl.StartKMR
    FROM dbo.trn_DailyLog dl
    WHERE dl.LogId = @LogID
      AND dl.LogType = 'Breakdown'
      AND dl.SubmissionStatus = 'Draft'
      AND ISNULL(dl.IsActive, 1) = 1;

    IF @AssetId_B IS NULL
    BEGIN
        RAISERROR('Active Breakdown log not found.', 16, 1);
        RETURN;
    END

    IF ISNULL(@ScopeDeptId, 0) <> 0
    BEGIN
        IF NOT EXISTS (
            SELECT 1
            FROM dbo.tbl_Asset a
            WHERE a.AssetId = @AssetId_B
              AND a.DeptId = @ScopeDeptId
              AND ISNULL(a.IsActive, 1) = 1
        )
        BEGIN
            RAISERROR('You can only modify logs for assets in your assigned department.', 16, 1);
            RETURN;
        END
    END

    IF LTRIM(RTRIM(ISNULL(@AuthRoleName, ''))) = 'Operator'
    BEGIN
        IF @OperatorId_B <> @AuthUserId
        BEGIN
            RAISERROR('Operator can end breakdown only for their own profile.', 16, 1);
            RETURN;
        END
    END

    IF @EndHMR_B IS NOT NULL AND @StartHMR_B IS NOT NULL AND @EndHMR_B < @StartHMR_B
    BEGIN
        RAISERROR('End HMR cannot be less than Start HMR.', 16, 1);
        RETURN;
    END

    IF @EndKMR_B IS NOT NULL AND @StartKMR_B IS NOT NULL AND @EndKMR_B < @StartKMR_B
    BEGIN
        RAISERROR('End KMR cannot be less than Start KMR.', 16, 1);
        RETURN;
    END

    IF @EndDateTime_B < @BreakdownStartDateTime
    BEGIN
        RAISERROR('EndDateTime cannot be less than LogStart.', 16, 1);
        RETURN;
    END

    UPDATE dbo.trn_DailyLog
    SET
        EndHMR = ISNULL(@EndHMR_B, StartHMR),
        EndKMR = ISNULL(@EndKMR_B, StartKMR),
        LogEnd = @EndDateTime_B,
        OperatorRemarks = ISNULL(@WorkingRemarks_B, OperatorRemarks),
        BreakdownReason = ISNULL(@BreakdownReason_B, BreakdownReason),
        EndHMRPhoto = ISNULL(NULLIF(@EndReadingPhoto_B, ''), EndHMRPhoto),
        EndKMRPhoto = ISNULL(NULLIF(@EndReadingPhoto_B, ''), EndKMRPhoto),
        RemarkPhotoPath = ISNULL(NULLIF(@RemarkPhoto_B, ''), RemarkPhotoPath),
        BreakdownPhtotoPath = ISNULL(NULLIF(@EndReadingPhoto_B, ''), BreakdownPhtotoPath),
        SubmissionStatus = 'Submitted',
        SubmittedBy = @AuthUserId,
        SubmittedOn = GETDATE(),
        WorkingHours = DATEDIFF(MINUTE, LogStart, @EndDateTime_B) / 60.0,
        ModifiedBy = @AuthUserId,
        ModifiedOn = GETDATE()
    WHERE LogId = @LogID
      AND SubmissionStatus = 'Draft';

    SELECT
        'Success' AS Status,
        'Breakdown ended successfully.' AS Msg,
        @LogID AS LogID;
END

ELSE IF (@Event = 'GetFuelLogForm')
BEGIN
    IF ISNULL(@AuthUserId, 0) = 0
    BEGIN
        RAISERROR('Unauthorized access.', 16, 1);
        RETURN;
    END

    IF ISNULL(@AssetID, 0) = 0
    BEGIN
        RAISERROR('AssetID is required.', 16, 1);
        RETURN;
    END

    IF ISNULL(@ScopeDeptId, 0) <> 0
    BEGIN
        IF NOT EXISTS (
            SELECT 1
            FROM dbo.tbl_Asset a
            WHERE a.AssetId = @AssetID
              AND a.DeptId = @ScopeDeptId
              AND ISNULL(a.IsActive, 1) = 1
        )
        BEGIN
            RAISERROR('You can only request fuel log form for assets in your assigned department.', 16, 1);
            RETURN;
        END
    END

    DECLARE @RecUnit VARCHAR(50);
    SELECT TOP 1
        @RecUnit = ISNULL(m.RecordingUnit, 'Hours')
    FROM dbo.tbl_Asset a
    LEFT JOIN dbo.mst_Model m ON m.ModelId = a.ModelId
    WHERE a.AssetId = @AssetID;

    DECLARE @CurrentReading DECIMAL(18,2) = 0;
    SELECT TOP 1
        @CurrentReading = CASE 
            WHEN @RecUnit IN ('Kilometers', 'KM', 'KMR') THEN COALESCE(NULLIF(EndKMR, 0), NULLIF(StartKMR, 0), 0)
            ELSE COALESCE(NULLIF(EndHMR, 0), NULLIF(StartHMR, 0), 0)
        END
    FROM dbo.trn_DailyLog
    WHERE AssetId = @AssetID
      AND ISNULL(IsActive, 1) = 1
    ORDER BY LogDate DESC, LogId DESC;

    SELECT TOP 1
        a.AssetId,
        a.AssetName,
        ISNULL(m.FuelType, 'Diesel')         AS FuelType,
        ISNULL(st.FuelUnit, 'Liters')        AS FuelUnit,
        ISNULL(m.RecordingUnit, 'Hours')     AS RecordingUnit,
        ISNULL(m.OutputUnit, '')             AS OutputUnit,
        ISNULL(@CurrentReading, 0)           AS CurrentReading,
        GETDATE()                            AS FuelDateTime,
        NULL                                 AS FuelQty,
        NULL                                 AS ReadingAtFueling,
        ''                                   AS Remarks
    FROM dbo.tbl_Asset a
    LEFT JOIN dbo.mst_Model m ON m.ModelId = a.ModelId
    LEFT JOIN dbo.mst_SubType st ON st.SubTypeId = a.SubTypeId
    WHERE a.AssetId = @AssetID;
END

ELSE IF (@Event = 'SaveFuelLog')
BEGIN
    IF ISNULL(@AuthUserId, 0) = 0
    BEGIN
        RAISERROR('Unauthorized access.', 16, 1);
        RETURN;
    END

    IF ISNULL(@AssetID, 0) = 0
    BEGIN
        RAISERROR('AssetID is required.', 16, 1);
        RETURN;
    END

    DECLARE @FuelDateTime_L   DATETIME      = TRY_CAST(DB_Masters.dbo.GetParameterValue_CSS_Lang(@ParameterString, 'FuelDateTime') AS DATETIME);
    DECLARE @FuelQty_L        DECIMAL(18,2) = TRY_CAST(DB_Masters.dbo.GetParameterValue_CSS_Lang(@ParameterString, 'FuelQty') AS DECIMAL(18,2));
    DECLARE @Reading_L        DECIMAL(18,2) = TRY_CAST(DB_Masters.dbo.GetParameterValue_CSS_Lang(@ParameterString, 'ReadingAtFueling') AS DECIMAL(18,2));
    DECLARE @FuelType_L       VARCHAR(100)  = DB_Masters.dbo.GetParameterValue_CSS_Lang(@ParameterString, 'FuelType');
    DECLARE @Remarks_L        VARCHAR(MAX)  = DB_Masters.dbo.GetParameterValue_CSS_Lang(@ParameterString, 'Remarks');
    DECLARE @PhotoPath_L      VARCHAR(MAX)  = DB_Masters.dbo.GetParameterValue_CSS_Lang(@ParameterString, 'PhotoPath');

    IF ISNULL(@ScopeDeptId, 0) <> 0
    BEGIN
        IF NOT EXISTS (
            SELECT 1
            FROM dbo.tbl_Asset a
            WHERE a.AssetId = @AssetID
              AND a.DeptId = @ScopeDeptId
              AND ISNULL(a.IsActive, 1) = 1
        )
        BEGIN
            RAISERROR('You can save fuel logs only for assets in your assigned department.', 16, 1);
            RETURN;
        END
    END

    IF @FuelDateTime_L IS NULL
    BEGIN
        RAISERROR('FuelDateTime is required.', 16, 1);
        RETURN;
    END

    IF ISNULL(@FuelQty_L, 0) <= 0
    BEGIN
        RAISERROR('FuelQty is required and must be greater than zero.', 16, 1);
        RETURN;
    END

    IF ISNULL(@Reading_L, 0) < 0
    BEGIN
        RAISERROR('Reading at fueling cannot be negative.', 16, 1);
        RETURN;
    END

    DECLARE @ProjId_L INT = NULL;
    SELECT TOP 1
        @ProjId_L = ProjId
    FROM dbo.tbl_ProjAssetAllocation
    WHERE AssetId = @AssetID
      AND ISNULL(IsActive, 1) = 1
      AND ReleaseDate IS NULL
    ORDER BY ProjAssetAllocId DESC;

    IF ISNULL(@ProjId_L, 0) = 0
    BEGIN
        RAISERROR('Project allocation not found for this asset.', 16, 1);
        RETURN;
    END

    DECLARE @OpId_L INT = @OperatorID;
    IF ISNULL(@OpId_L, 0) = 0
    BEGIN
        SELECT TOP 1
            @OpId_L = UserId
        FROM dbo.tbl_AssetOpAllocation
        WHERE AssetId = @AssetID
          AND ISNULL(IsActive, 1) = 1
          AND ReleaseDate IS NULL
        ORDER BY UserId DESC;
    END

    IF ISNULL(@OpId_L, 0) = 0
        SET @OpId_L = @AuthUserId;

    DECLARE @FinalFuelType VARCHAR(50);
    DECLARE @FinalFuelUnit VARCHAR(20);

    SELECT TOP 1
        @FinalFuelType = ISNULL(NULLIF(@FuelType_L, ''), ISNULL(m.FuelType, 'Diesel')),
        @FinalFuelUnit = ISNULL(st.FuelUnit, 'Liters')
    FROM dbo.tbl_Asset a
    LEFT JOIN dbo.mst_Model m ON m.ModelId = a.ModelId
    LEFT JOIN dbo.mst_SubType st ON st.SubTypeId = a.SubTypeId
    WHERE a.AssetId = @AssetID;

    INSERT INTO dbo.trn_FuelLog
    (
        FuelDateTime,
        ProjId,
        AssetId,
        UserId,
        FuelType,
        FuelUnit,
        FuelQty,
        ReadingAtFueling,
        Remarks,
        PhotoPath,
        IsActive,
        CreatedBy,
        CreatedOn
    )
    VALUES
    (
        @FuelDateTime_L,
        @ProjId_L,
        @AssetID,
        @OpId_L,
        @FinalFuelType,
        @FinalFuelUnit,
        @FuelQty_L,
        ISNULL(@Reading_L, 0),
        @Remarks_L,
        NULLIF(@PhotoPath_L, ''),
        1,
        @AuthUserId,
        GETDATE()
    );

    SELECT
        'Success' AS Status,
        'Fuel log saved successfully.' AS Msg,
        SCOPE_IDENTITY() AS FuelLogID;
END

ELSE IF (@Event = 'GetAssetQuickViewHeader')
BEGIN
    IF ISNULL(@AuthUserId, 0) = 0
    BEGIN
        RAISERROR('Unauthorized access.', 16, 1);
        RETURN;
    END

    IF ISNULL(@AssetID, 0) = 0
    BEGIN
        RAISERROR('AssetID is required.', 16, 1);
        RETURN;
    END

    IF ISNULL(@ScopeDeptId, 0) <> 0
    BEGIN
        IF NOT EXISTS (
            SELECT 1
            FROM dbo.tbl_Asset a
            WHERE a.AssetId = @AssetID
              AND a.DeptId = @ScopeDeptId
              AND ISNULL(a.IsActive, 1) = 1
        )
        BEGIN
            RAISERROR('You can only request quick view header for assets in your assigned department.', 16, 1);
            RETURN;
        END
    END


    
    ;WITH ActiveMount AS
    (
        SELECT am.ChassisAssetId, am.UpperAssetId, am.VirtualAssetId
        FROM dbo.tbl_AssetMount am
        INNER JOIN dbo.tbl_Asset v ON v.AssetId = am.VirtualAssetId AND ISNULL(v.IsActive, 1) = 1
        WHERE ISNULL(am.IsActive, 1) = 1 AND am.MountedOn IS NOT NULL AND am.UnmountedOn IS NULL
    )
    SELECT @EffectiveAssetId = CASE 
        WHEN ISNULL(a.IsVirtualAsset, 0) = 1 THEN a.AssetId
        WHEN am.VirtualAssetId IS NOT NULL THEN am.VirtualAssetId
        ELSE a.AssetId
    END
    FROM dbo.tbl_Asset a
    LEFT JOIN ActiveMount am ON am.ChassisAssetId = a.AssetId OR am.UpperAssetId = a.AssetId
    WHERE a.AssetId = @AssetID;

    ;WITH ActiveMount AS
    (
        SELECT
            am.ChassisAssetId,
            am.UpperAssetId,
            am.VirtualAssetId
        FROM dbo.tbl_AssetMount am
        INNER JOIN dbo.tbl_Asset v
            ON v.AssetId = am.VirtualAssetId
           AND ISNULL(v.IsActive, 1) = 1
        WHERE ISNULL(am.IsActive, 1) = 1
          AND am.MountedOn IS NOT NULL
          AND am.UnmountedOn IS NULL
    ),
    AssetOperationalMap AS
    (
        SELECT
            a.AssetId AS BaseAssetId,
            CASE
                WHEN ISNULL(a.IsVirtualAsset, 0) = 1 THEN a.AssetId
                WHEN am.VirtualAssetId IS NOT NULL THEN am.VirtualAssetId
                ELSE a.AssetId
            END AS EffectiveAssetId
        FROM dbo.tbl_Asset a
        LEFT JOIN ActiveMount am
            ON am.ChassisAssetId = a.AssetId
            OR am.UpperAssetId   = a.AssetId
        WHERE ISNULL(a.IsActive, 1) = 1
    ),
    ActiveProject AS
    (
        SELECT TOP 1 paa.ProjId
        FROM dbo.tbl_ProjAssetAllocation paa
        INNER JOIN AssetOperationalMap map
            ON map.BaseAssetId = paa.AssetId
        WHERE map.EffectiveAssetId = @EffectiveAssetId
          AND ISNULL(paa.IsActive, 1) = 1
          AND paa.ReleaseDate IS NULL
        ORDER BY paa.ProjAssetAllocId DESC
    ),
    LatestSubmitted AS
    (
        SELECT 
            map.EffectiveAssetId AS AssetId, 
            dl.StartHMR,
            dl.EndHMR,
            dl.StartKMR,
            dl.EndKMR,
            ROW_NUMBER() OVER (PARTITION BY map.EffectiveAssetId ORDER BY dl.LogDate DESC, dl.LogId DESC) AS rn
        FROM dbo.trn_DailyLog dl
        INNER JOIN AssetOperationalMap map
            ON map.BaseAssetId = dl.AssetId
        WHERE dl.SubmissionStatus IN ('Submitted', 'Locked')
          AND ISNULL(dl.IsActive, 1) = 1
    ),
    OpenWorking AS
    (
        SELECT map.EffectiveAssetId AS AssetId, dl.LogId 
        FROM dbo.trn_DailyLog dl
        INNER JOIN AssetOperationalMap map
            ON map.BaseAssetId = dl.AssetId
        WHERE dl.LogType = 'Working' AND dl.SubmissionStatus = 'Draft' AND ISNULL(dl.IsActive, 1) = 1
    ),
    OpenInterrupt AS
    (
        SELECT map.EffectiveAssetId AS AssetId, dl.LogId, dl.LogType 
        FROM dbo.trn_DailyLog dl
        INNER JOIN AssetOperationalMap map
            ON map.BaseAssetId = dl.AssetId
        WHERE dl.LogType IN ('Breakdown', 'UnderMaintenance') AND dl.SubmissionStatus = 'Draft' AND ISNULL(dl.IsActive, 1) = 1
    )
    SELECT
        a.AssetId,
        a.AssetName,
        a.RegistrationNo,
        mk.MakeName                          AS Make,
        m.ModelNo                            AS ModelName,
        a.PhotoPath,
        m.RecordingUnit,
        m.OutputUnit,
        t.TypeName                           AS AssetTypeName,
        p.ProjCode                           AS ProjectCode,
        p.ProjName                           AS ProjectName,
        ISNULL(
            (
                SELECT STRING_AGG(u2.UserName, ', ')
                FROM dbo.tbl_AssetOpAllocation ao2
                INNER JOIN AssetOperationalMap map
                    ON map.BaseAssetId = ao2.AssetId
                JOIN dbo.tbl_User u2 ON u2.UserId = ao2.UserId
                WHERE map.EffectiveAssetId = a.AssetId
                  AND ao2.ReleaseDate IS NULL
                  AND ISNULL(ao2.IsActive, 1) = 1
            ), ''
        )                                    AS OperatorName,
        ISNULL(
            CASE
                WHEN m.RecordingUnit IN ('Kilometers', 'KM', 'KMR') THEN COALESCE(NULLIF(ls.EndKMR, 0), NULLIF(ls.StartKMR, 0), 0)
                ELSE COALESCE(NULLIF(ls.EndHMR, 0), NULLIF(ls.StartHMR, 0), 0)
            END, 0
        )                                    AS Reading,
        CASE
            WHEN oi.LogType = 'Breakdown'        THEN 'Breakdown'
            WHEN oi.LogType = 'UnderMaintenance' THEN 'Under Maintenance'
            WHEN ow.LogId IS NOT NULL            THEN 'Working'
            ELSE 'Idle'
        END                                  AS CurrentStatus
    FROM dbo.tbl_Asset a
    LEFT JOIN dbo.mst_Make mk ON mk.MakeId = a.MakeId
    LEFT JOIN dbo.mst_Model m ON m.ModelId = a.ModelId
    LEFT JOIN dbo.mst_Type t ON t.TypeId = a.TypeId
    LEFT JOIN dbo.tbl_Project p ON p.ProjId = (SELECT TOP 1 ProjId FROM ActiveProject)
    LEFT JOIN LatestSubmitted ls ON ls.AssetId = a.AssetId AND ls.rn = 1
    LEFT JOIN OpenWorking ow     ON ow.AssetId = a.AssetId
    LEFT JOIN OpenInterrupt oi   ON oi.AssetId = a.AssetId
    WHERE a.AssetId = @EffectiveAssetId 
      AND ISNULL(a.IsActive, 1) = 1;
END

ELSE IF (@Event = 'GetFuelLogsForAsset')
BEGIN
    IF ISNULL(@AuthUserId, 0) = 0
    BEGIN
        RAISERROR('Unauthorized access.', 16, 1);
        RETURN;
    END

    IF ISNULL(@AssetID, 0) = 0
    BEGIN
        RAISERROR('AssetID is required.', 16, 1);
        RETURN;
    END

    -- Resolve @AssetID to its Effective (Virtual) AssetId

    
    ;WITH ActiveMount AS
    (
        SELECT am.ChassisAssetId, am.UpperAssetId, am.VirtualAssetId
        FROM dbo.tbl_AssetMount am
        INNER JOIN dbo.tbl_Asset v ON v.AssetId = am.VirtualAssetId AND ISNULL(v.IsActive, 1) = 1
        WHERE ISNULL(am.IsActive, 1) = 1 AND am.MountedOn IS NOT NULL AND am.UnmountedOn IS NULL
    )
    SELECT @EffectiveAssetId = CASE 
        WHEN ISNULL(a.IsVirtualAsset, 0) = 1 THEN a.AssetId
        WHEN am.VirtualAssetId IS NOT NULL THEN am.VirtualAssetId
        ELSE a.AssetId
    END
    FROM dbo.tbl_Asset a
    LEFT JOIN ActiveMount am ON am.ChassisAssetId = a.AssetId OR am.UpperAssetId = a.AssetId
    WHERE a.AssetId = @AssetID;

    IF ISNULL(@ScopeDeptId, 0) <> 0
    BEGIN
        IF NOT EXISTS (
            SELECT 1
            FROM dbo.tbl_Asset a
            WHERE a.AssetId = @EffectiveAssetId
              AND a.DeptId = @ScopeDeptId
              AND ISNULL(a.IsActive, 1) = 1
        )
        BEGIN
            RAISERROR('You can only view fuel logs for assets in your assigned department.', 16, 1);
            RETURN;
        END
    END

    ;WITH ActiveMount AS
    (
        SELECT
            am.ChassisAssetId,
            am.UpperAssetId,
            am.VirtualAssetId
        FROM dbo.tbl_AssetMount am
        INNER JOIN dbo.tbl_Asset v
            ON v.AssetId = am.VirtualAssetId
           AND ISNULL(v.IsActive, 1) = 1
        WHERE ISNULL(am.IsActive, 1) = 1
          AND am.MountedOn IS NOT NULL
          AND am.UnmountedOn IS NULL
    ),
    AssetOperationalMap AS
    (
        SELECT
            a.AssetId AS BaseAssetId,
            CASE
                WHEN ISNULL(a.IsVirtualAsset, 0) = 1 THEN a.AssetId
                WHEN am.VirtualAssetId IS NOT NULL THEN am.VirtualAssetId
                ELSE a.AssetId
            END AS EffectiveAssetId
        FROM dbo.tbl_Asset a
        LEFT JOIN ActiveMount am
            ON am.ChassisAssetId = a.AssetId
            OR am.UpperAssetId   = a.AssetId
        WHERE ISNULL(a.IsActive, 1) = 1
    )
    SELECT
        fl.FuelLogID,
        map.EffectiveAssetId             AS AssetID,
        CAST(fl.FuelDateTime AS DATE)   AS LogDate,
        fl.FuelDateTime,
        fl.FuelQty,
        fl.ReadingAtFueling,
        fl.FuelType,
        fl.Remarks,
        fl.PhotoPath,
        fl.CreatedBy,
        fl.CreatedOn,
        u.UserName                      AS OperatorName,
        p.ProjName                      AS ProjectName
    FROM dbo.trn_FuelLog fl
    INNER JOIN AssetOperationalMap map
        ON map.BaseAssetId = fl.AssetId
    LEFT JOIN dbo.tbl_User u ON u.UserId = fl.UserId
    LEFT JOIN dbo.tbl_Project p ON p.ProjId = fl.ProjId
    WHERE map.EffectiveAssetId = @EffectiveAssetId
      AND ISNULL(fl.IsActive, 1) = 1
    ORDER BY fl.FuelDateTime DESC;
END

ELSE IF (@Event = 'GetAssetQuickViewLogs')
BEGIN
    IF ISNULL(@AuthUserId, 0) = 0
    BEGIN
        RAISERROR('Unauthorized access.', 16, 1);
        RETURN;
    END

    IF ISNULL(@AssetID, 0) = 0
    BEGIN
        RAISERROR('AssetID is required.', 16, 1);
        RETURN;
    END

    -- Resolve @AssetID to its Effective (Virtual) AssetId

    
    ;WITH ActiveMount AS
    (
        SELECT am.ChassisAssetId, am.UpperAssetId, am.VirtualAssetId
        FROM dbo.tbl_AssetMount am
        INNER JOIN dbo.tbl_Asset v ON v.AssetId = am.VirtualAssetId AND ISNULL(v.IsActive, 1) = 1
        WHERE ISNULL(am.IsActive, 1) = 1 AND am.MountedOn IS NOT NULL AND am.UnmountedOn IS NULL
    )
    SELECT @EffectiveAssetId = CASE 
        WHEN ISNULL(a.IsVirtualAsset, 0) = 1 THEN a.AssetId
        WHEN am.VirtualAssetId IS NOT NULL THEN am.VirtualAssetId
        ELSE a.AssetId
    END
    FROM dbo.tbl_Asset a
    LEFT JOIN ActiveMount am ON am.ChassisAssetId = a.AssetId OR am.UpperAssetId = a.AssetId
    WHERE a.AssetId = @AssetID;

    IF ISNULL(@ScopeDeptId, 0) <> 0
    BEGIN
        IF NOT EXISTS (
            SELECT 1
            FROM dbo.tbl_Asset a
            WHERE a.AssetId = @EffectiveAssetId
              AND a.DeptId = @ScopeDeptId
              AND ISNULL(a.IsActive, 1) = 1
        )
        BEGIN
            RAISERROR('You can only view logs for assets in your assigned department.', 16, 1);
            RETURN;
        END
    END

    DECLARE @LogsOpID INT = NULLIF(TRY_CAST(DB_Masters.dbo.GetParameterValue_CSS_Lang(@ParameterString, 'OperatorID') AS INT), 0);
    DECLARE @WeekOffset INT = TRY_CAST(DB_Masters.dbo.GetParameterValue_CSS_Lang(@ParameterString, 'WeekOffset') AS INT);
    IF @WeekOffset IS NULL SET @WeekOffset = 0;

    DECLARE @OpProjectID INT = NULL;
    IF @LogsOpID IS NOT NULL
    BEGIN
        SELECT TOP 1 @OpProjectID = ProjId
        FROM dbo.tbl_ProjOpAllocation
        WHERE UserId = @LogsOpID AND IsActive = 1
        ORDER BY ProjOpAllocId DESC;
    END

    DECLARE @Dates TABLE (LogDate DATE, RowNum INT);
    
    ;WITH ActiveMount AS
    (
        SELECT
            am.ChassisAssetId,
            am.UpperAssetId,
            am.VirtualAssetId
        FROM dbo.tbl_AssetMount am
        INNER JOIN dbo.tbl_Asset v
            ON v.AssetId = am.VirtualAssetId
           AND ISNULL(v.IsActive, 1) = 1
        WHERE ISNULL(am.IsActive, 1) = 1
          AND am.MountedOn IS NOT NULL
          AND am.UnmountedOn IS NULL
    ),
    AssetOperationalMap AS
    (
        SELECT
            a.AssetId AS BaseAssetId,
            CASE
                WHEN ISNULL(a.IsVirtualAsset, 0) = 1 THEN a.AssetId
                WHEN am.VirtualAssetId IS NOT NULL THEN am.VirtualAssetId
                ELSE a.AssetId
            END AS EffectiveAssetId
        FROM dbo.tbl_Asset a
        LEFT JOIN ActiveMount am
            ON am.ChassisAssetId = a.AssetId
            OR am.UpperAssetId   = a.AssetId
        WHERE ISNULL(a.IsActive, 1) = 1
    )
    INSERT INTO @Dates (LogDate, RowNum)
    SELECT DISTINCT CAST(dl.LogDate AS DATE) AS LogDate,
           ROW_NUMBER() OVER (ORDER BY CAST(dl.LogDate AS DATE) DESC) AS RowNum
    FROM dbo.trn_DailyLog dl
    INNER JOIN AssetOperationalMap map
        ON map.BaseAssetId = dl.AssetId
    WHERE map.EffectiveAssetId = @EffectiveAssetId
      AND ISNULL(dl.IsActive, 1) = 1
      AND (
            @LogsOpID IS NULL
            OR dl.UserId = @LogsOpID
            OR (
                @OpProjectID IS NOT NULL
                AND dl.UserId IN (
                    SELECT UserId FROM dbo.tbl_AssetOpAllocation aoa
                    INNER JOIN AssetOperationalMap map2 ON map2.BaseAssetId = aoa.AssetId
                    WHERE map2.EffectiveAssetId = @EffectiveAssetId AND aoa.ReleaseDate IS NULL AND ISNULL(aoa.IsActive, 1) = 1
                    UNION
                    SELECT UserId FROM dbo.tbl_ProjOpAllocation
                    WHERE ProjId = @OpProjectID AND ISNULL(IsActive, 1) = 1
                )
            )
          );

    DECLARE @StartRow INT = (@WeekOffset * 7) + 1;
    DECLARE @EndRow INT = (@WeekOffset + 1) * 7;

    ;WITH ActiveMount AS
    (
        SELECT
            am.ChassisAssetId,
            am.UpperAssetId,
            am.VirtualAssetId
        FROM dbo.tbl_AssetMount am
        INNER JOIN dbo.tbl_Asset v
            ON v.AssetId = am.VirtualAssetId
           AND ISNULL(v.IsActive, 1) = 1
        WHERE ISNULL(am.IsActive, 1) = 1
          AND am.MountedOn IS NOT NULL
          AND am.UnmountedOn IS NULL
    ),
    AssetOperationalMap AS
    (
        SELECT
            a.AssetId AS BaseAssetId,
            CASE
                WHEN ISNULL(a.IsVirtualAsset, 0) = 1 THEN a.AssetId
                WHEN am.VirtualAssetId IS NOT NULL THEN am.VirtualAssetId
                ELSE a.AssetId
            END AS EffectiveAssetId
        FROM dbo.tbl_Asset a
        LEFT JOIN ActiveMount am
            ON am.ChassisAssetId = a.AssetId
            OR am.UpperAssetId   = a.AssetId
        WHERE ISNULL(a.IsActive, 1) = 1
    )
    SELECT
        dl.LogId                         AS LogID,
        NULL                             AS ParentLogID,
        map.EffectiveAssetId             AS AssetID,
        dl.LogDate,
        dl.LogStart                      AS StartDateTime,
        dl.LogEnd                        AS EndDateTime,
        dl.StartHMR,
        dl.EndHMR,
        dl.StartKMR,
        dl.EndKMR,
        COALESCE(dl.WorkingHours, DATEDIFF(MINUTE, dl.LogStart, dl.LogEnd) / 60.0, 0) AS TotalHours,
        dl.LogType,
        dl.MachineStatus,
        dl.ProductionQty,
        m.OutputUnit                     AS ProductionUnit,
        dl.OperatorRemarks               AS Remarks,
        COALESCE(NULLIF(dl.BreakdownReason, ''), NULLIF(dl.MaintainceReason, '')) AS BreakdownReason,
        dl.UserId                        AS OperatorID,
        u.UserName                       AS OperatorName,
        dl.ProjId                        AS ProjectID,
        p.ProjName                       AS ProjectName,
        COALESCE(dl.EndHMRPhoto, dl.EndKMRPhoto, dl.RemarkPhotoPath) AS PhotoPath,
        dl.SubmissionStatus,
        dl.LogVerificationStatus,
        dl.LogVerificationDate
    FROM dbo.trn_DailyLog dl
    INNER JOIN AssetOperationalMap map
        ON map.BaseAssetId = dl.AssetId
    LEFT JOIN dbo.tbl_User u ON u.UserId = dl.UserId
    LEFT JOIN dbo.tbl_Project p ON p.ProjId = dl.ProjId
    LEFT JOIN dbo.tbl_Asset a ON a.AssetId = dl.AssetId
    LEFT JOIN dbo.mst_Model m ON m.ModelId = a.ModelId
    WHERE map.EffectiveAssetId = @EffectiveAssetId
      AND ISNULL(dl.IsActive, 1) = 1
      AND CAST(dl.LogDate AS DATE) IN (
          SELECT LogDate FROM @Dates WHERE RowNum BETWEEN @StartRow AND @EndRow
      )
      AND (
            @LogsOpID IS NULL
            OR dl.UserId = @LogsOpID
            OR (
                @OpProjectID IS NOT NULL
                AND dl.UserId IN (
                    SELECT UserId FROM dbo.tbl_AssetOpAllocation aoa
                    INNER JOIN AssetOperationalMap map2 ON map2.BaseAssetId = aoa.AssetId
                    WHERE map2.EffectiveAssetId = @EffectiveAssetId AND aoa.ReleaseDate IS NULL AND ISNULL(aoa.IsActive, 1) = 1
                    UNION
                    SELECT UserId FROM dbo.tbl_ProjOpAllocation
                    WHERE ProjId = @OpProjectID AND ISNULL(IsActive, 1) = 1
                )
            )
          )
    ORDER BY dl.LogDate DESC, dl.LogId DESC;
END

ELSE IF (@Event = 'GetOperatorDashboard')
BEGIN
    IF ISNULL(@AuthUserId, 0) = 0
    BEGIN
        RAISERROR('Unauthorized access.', 16, 1);
        RETURN;
    END

    IF @OperatorID IS NULL
    BEGIN
        RAISERROR('OperatorID is required.', 16, 1);
        RETURN;
    END

    IF ISNULL(@ScopeDeptId, 0) <> 0
    BEGIN
        IF NOT EXISTS (
            SELECT 1
            FROM dbo.tbl_User u
            WHERE u.UserId = @OperatorID
              AND u.DeptId = @ScopeDeptId
              AND ISNULL(u.IsActive, 1) = 1
        )
        BEGIN
            RAISERROR('You can only view dashboard for operators in your assigned department.', 16, 1);
            RETURN;
        END
    END

    ;WITH Last4Days AS
    (
        SELECT CAST(GETDATE() AS DATE) AS WorkDate
        UNION ALL SELECT DATEADD(DAY, -1, CAST(GETDATE() AS DATE))
        UNION ALL SELECT DATEADD(DAY, -2, CAST(GETDATE() AS DATE))
        UNION ALL SELECT DATEADD(DAY, -3, CAST(GETDATE() AS DATE))
    )
    SELECT
        D.WorkDate,
        DATENAME(WEEKDAY, D.WorkDate)   AS DayName,
        DAY(D.WorkDate)                 AS DayNo,
        ISNULL((
            SELECT CAST(SUM(ISNULL(dl.WorkingHours, 0)) AS DECIMAL(10,1))
            FROM dbo.trn_DailyLog dl
            WHERE dl.UserId = @OperatorID
              AND CAST(dl.LogDate AS DATE) = D.WorkDate
              AND ISNULL(dl.IsActive, 1) = 1
        ), 0) AS WorkHours,

        ISNULL((
            SELECT SUM(F.FuelQty)
            FROM dbo.trn_FuelLog F
            WHERE CAST(F.FuelDateTime AS DATE) = D.WorkDate
              AND F.UserId = @OperatorID
              AND ISNULL(F.IsActive, 1) = 1
        ), 0) AS FuelUsed,

        CASE
            WHEN EXISTS (
                SELECT 1 FROM dbo.trn_DailyLog dl
                WHERE dl.UserId = @OperatorID
                  AND CAST(dl.LogDate AS DATE) = D.WorkDate
                  AND ISNULL(dl.IsActive, 1) = 1
            ) THEN 'Completed'
            ELSE 'Not Logged'
        END AS Status,
        T.TotalHours,     
        T.TotalLogs,      
        T.TodayFuelUsed,    
        T.IssuesReported  
    FROM Last4Days D
    CROSS JOIN
    (
        SELECT
            CAST(ISNULL(SUM(dl.WorkingHours), 0) AS DECIMAL(10,1)) AS TotalHours,
            COUNT(dl.LogId) AS TotalLogs,
            ISNULL((
                SELECT SUM(FL.FuelQty)
                FROM dbo.trn_FuelLog FL
                WHERE CAST(FL.FuelDateTime AS DATE) = CAST(GETDATE() AS DATE)
                  AND FL.UserId = @OperatorID
                  AND ISNULL(FL.IsActive, 1) = 1
            ), 0) AS TodayFuelUsed,
            SUM(CASE
                WHEN dl.MachineStatus IN ('Breakdown', 'Under Maintenance', 'UnderMaintenance') THEN 1
                ELSE 0
            END) AS IssuesReported
        FROM dbo.trn_DailyLog dl
        WHERE dl.UserId = @OperatorID
          AND CAST(dl.LogDate AS DATE) = CAST(GETDATE() AS DATE)
          AND ISNULL(dl.IsActive, 1) = 1
    ) T
    ORDER BY D.WorkDate DESC;
END

ELSE IF (@Event = 'GetMyWorkLogReportForMobile')
BEGIN
    IF ISNULL(@AuthUserId, 0) = 0
    BEGIN
        RAISERROR('Unauthorized access.', 16, 1);
        RETURN;
    END

    DECLARE @DateFrom_L DATE = ISNULL(@DateFrom, CAST(DATEADD(DAY, -1, GETDATE()) AS DATE));
    DECLARE @DateTo_L   DATE = ISNULL(@DateTo, CAST(GETDATE() AS DATE));

    SELECT
        a.AssetName                                                AS [AssetName],
        dl.LogType                                                 AS [LogType],
        CONVERT(VARCHAR(10), CAST(dl.LogStart AS DATE), 120)       AS [StartDate],
        CONVERT(VARCHAR(5),  CAST(dl.LogStart AS TIME), 108)       AS [StartTime],
        CONVERT(VARCHAR(10), CAST(dl.LogEnd   AS DATE), 120)       AS [StopDate],
        CONVERT(VARCHAR(5),  CAST(dl.LogEnd   AS TIME), 108)       AS [StopTime],
        ISNULL(dl.StartHMR, 0)                                     AS [StartHMR],
        ISNULL(dl.EndHMR,   0)                                     AS [EndHMR],
        ISNULL(dl.StartKMR, 0)                                     AS [StartKMR],
        ISNULL(dl.EndKMR,   0)                                     AS [EndKMR],
        ISNULL(o.UserName, '')                                     AS [Operator],
        dl.CreatedOn
    FROM dbo.trn_DailyLog dl
    LEFT JOIN dbo.tbl_Asset a ON a.AssetId = dl.AssetId
    LEFT JOIN dbo.tbl_Project p ON p.ProjId = dl.ProjId
    LEFT JOIN dbo.tbl_User o ON o.UserId = dl.UserId
    WHERE dl.LogDate >= @DateFrom_L
      AND dl.LogDate < DATEADD(DAY, 1, @DateTo_L)
      AND ISNULL(dl.IsActive, 1) = 1
      AND (
          ISNULL(@OperatorID, 0) = 0
          OR dl.UserId = @OperatorID
      )
      AND (
          ISNULL(@ScopeDeptId, 0) = 0
          OR o.DeptId = @ScopeDeptId
      )
    ORDER BY dl.CreatedOn DESC;
END
ELSE IF (@Event = 'UpdateUser')
BEGIN
    DECLARE @Local_UserId_U INT = TRY_CAST(DB_Masters.dbo.GetParameterValue_CSS_Lang(@ParameterString, 'UserId') AS INT);
    DECLARE @Local_PhotoPath_U VARCHAR(MAX) = DB_Masters.dbo.GetParameterValue_CSS_Lang(@ParameterString, 'PhotoPath');

    UPDATE dbo.tbl_User
    SET PhotoPath = ISNULL(@Local_PhotoPath_U, PhotoPath),
        ModifiedOn = GETDATE()
    WHERE UserId = @Local_UserId_U OR EmpId = DB_Masters.dbo.GetParameterValue_CSS_Lang(@ParameterString, 'UserId');

    SELECT 'Success' AS Status, 'User profile updated successfully.' AS Msg, @Local_UserId_U AS userId;
    RETURN;
END
ELSE IF (@Event = 'UpdateAsset')
BEGIN
    DECLARE @Local_AssetID_A INT = TRY_CAST(DB_Masters.dbo.GetParameterValue_CSS_Lang(@ParameterString, 'assetId') AS INT);
    DECLARE @Local_PhotoPath_A VARCHAR(MAX) = DB_Masters.dbo.GetParameterValue_CSS_Lang(@ParameterString, 'photoPath');

    UPDATE dbo.tbl_Asset
    SET PhotoPath = ISNULL(@Local_PhotoPath_A, PhotoPath),
        ModifiedOn = GETDATE()
    WHERE AssetId = @Local_AssetID_A;

    SELECT 'Success' AS Status, 'Asset updated successfully.' AS Msg, @Local_AssetID_A AS assetId;
    RETURN;
END

ELSE IF (@Event = 'SaveAddLogBulk')
BEGIN
    IF ISNULL(@AuthUserId, 0) = 0
    BEGIN
        RAISERROR('Unauthorized access.', 16, 1);
        RETURN;
    END

    DECLARE @LogJson NVARCHAR(MAX);
    DECLARE @CreatedByBulk INT;
    DECLARE @BulkSessionID UNIQUEIDENTIFIER = NEWID();

    SET @CreatedByBulk = @AuthUserId;
    SET @LogJson = DB_Masters.dbo.GetParameterValue_CSS_Lang(@ParameterString, 'logjson');

    IF ISNULL(@AuthUserId, 0) = 0
        RAISERROR('CreatedBy is required.', 16, 1);

    IF ISNULL(@LogJson, '') = ''
        RAISERROR('logjson is required.', 16, 1);

    DECLARE @BulkItems TABLE
    (
        RowNo INT,
        LogID INT NULL,
        AssetID INT,
        OperatorID INT,
        ProjectID INT,
        StartDateTime DATETIME,
        StartHMR DECIMAL(18,2) NULL,
        StartKMR DECIMAL(18,2) NULL,
        EndDateTime DATETIME NULL,
        EndHMR DECIMAL(18,2) NULL,
        EndKMR DECIMAL(18,2) NULL,
        MachineStatus VARCHAR(100),
        OutputQty DECIMAL(18,2),
        ProductionUnit VARCHAR(100),
        FuelQty DECIMAL(18,2),
        BreakdownReason VARCHAR(1000),
        WorkingRemarks VARCHAR(2000),
        BreakdownHours DECIMAL(18,2),
        IdleHours DECIMAL(18,2),
        LunchDinnerHours DECIMAL(18,2),
        EndReadingPhoto VARCHAR(500),
        RemarkPhoto VARCHAR(500),
        CreatedBy INT,
        LogVerificationStatus BIT,
        LogVerificationDate DATETIME2(0)
    );

    INSERT INTO @BulkItems
    (
        RowNo,
        LogID,
        AssetID,
        OperatorID,
        ProjectID,
        StartDateTime,
        StartHMR,
        StartKMR,
        EndDateTime,
        EndHMR,
        EndKMR,
        MachineStatus,
        OutputQty,
        ProductionUnit,
        FuelQty,
        BreakdownReason,
        WorkingRemarks,
        BreakdownHours,
        IdleHours,
        LunchDinnerHours,
        EndReadingPhoto,
        RemarkPhoto,
        CreatedBy,
        LogVerificationStatus,
        LogVerificationDate
    )
    SELECT
        RowNo,
        LogID,
        AssetID,
        OperatorID,
        ProjectID,
        StartDateTime,
        StartHMR,
        StartKMR,
        EndDateTime,
        EndHMR,
        EndKMR,
        MachineStatus,
        OutputQty,
        ProductionUnit,
        FuelQty,
        BreakdownReason,
        WorkingRemarks,
        BreakdownHours,
        IdleHours,
        LunchDinnerHours,
        EndReadingPhoto,
        RemarkPhoto,
        ISNULL(CreatedBy, @CreatedByBulk),
        ISNULL(LogVerificationStatus, 0),
        LogVerificationDate
    FROM OPENJSON(@LogJson, '$.items')
    WITH
    (
        RowNo INT '$.RowNo',
        LogID INT '$.LogID',
        AssetID INT '$.AssetID',
        OperatorID INT '$.OperatorID',
        ProjectID INT '$.ProjectID',
        StartDateTime DATETIME '$.StartDateTime',
        StartHMR DECIMAL(18,2) '$.StartHMR',
        StartKMR DECIMAL(18,2) '$.StartKMR',
        EndDateTime DATETIME '$.EndDateTime',
        EndHMR DECIMAL(18,2) '$.EndHMR',
        EndKMR DECIMAL(18,2) '$.EndKMR',
        MachineStatus VARCHAR(100) '$.MachineStatus',
        OutputQty DECIMAL(18,2) '$.OutputQty',
        ProductionUnit VARCHAR(100) '$.ProductionUnit',
        FuelQty DECIMAL(18,2) '$.FuelQty',
        BreakdownReason VARCHAR(1000) '$.BreakdownReason',
        WorkingRemarks VARCHAR(2000) '$.WorkingRemarks',
        BreakdownHours DECIMAL(18,2) '$.BreakdownHours',
        IdleHours DECIMAL(18,2) '$.IdleHours',
        LunchDinnerHours DECIMAL(18,2) '$.LunchDinnerHours',
        EndReadingPhoto VARCHAR(500) '$.EndReadingPhoto',
        RemarkPhoto VARCHAR(500) '$.RemarkPhoto',
        CreatedBy INT '$.CreatedBy',
        LogVerificationStatus BIT '$.LogVerificationStatus',
        LogVerificationDate DATETIME2(0) '$.LogVerificationDate'
    );

    IF NOT EXISTS (SELECT 1 FROM @BulkItems)
        RAISERROR('No bulk log rows found in logjson.', 16, 1);

    IF EXISTS (SELECT 1 FROM @BulkItems WHERE ISNULL(AssetID, 0) = 0)
        RAISERROR('AssetID is required in one or more rows.', 16, 1);

    IF EXISTS (SELECT 1 FROM @BulkItems WHERE StartDateTime IS NULL)
        RAISERROR('StartDateTime is required in one or more rows.', 16, 1);

    IF EXISTS (SELECT 1 FROM @BulkItems WHERE EndDateTime IS NULL)
        RAISERROR('EndDateTime is required in one or more rows for bulk complete log save.', 16, 1);

    IF EXISTS (SELECT 1 FROM @BulkItems WHERE ISNULL(OperatorID, 0) = 0)
        RAISERROR('OperatorID is required in one or more rows.', 16, 1);

    IF EXISTS (SELECT 1 FROM @BulkItems WHERE ISNULL(MachineStatus, '') = '')
        RAISERROR('MachineStatus is required in one or more rows.', 16, 1);

    IF EXISTS (
        SELECT 1
        FROM @BulkItems
        WHERE EndDateTime IS NOT NULL
          AND EndDateTime < StartDateTime
    )
        RAISERROR('EndDateTime cannot be less than StartDateTime in one or more rows.', 16, 1);

    ;WITH ResolvedRows AS
    (
        SELECT
            b.RowNo,
            b.LogID,
            b.AssetID,
            b.OperatorID,
            b.ProjectID,
            b.StartDateTime,
            b.StartHMR,
            b.StartKMR,
            b.EndDateTime,
            b.EndHMR,
            b.EndKMR,
            b.MachineStatus,
            b.OutputQty,
            b.ProductionUnit,
            b.FuelQty,
            b.BreakdownReason,
            b.WorkingRemarks,
            b.BreakdownHours,
            b.IdleHours,
            b.LunchDinnerHours,
            b.EndReadingPhoto,
            b.RemarkPhoto,
            b.CreatedBy,
            b.LogVerificationStatus,
            b.LogVerificationDate,
            CAST(b.StartDateTime AS DATE) AS LogDate,
            ISNULL(NULLIF(b.ProductionUnit,''), ISNULL(NULLIF(m.OutputUnit,''), '')) AS FinalProductionUnit,
            ISNULL(NULLIF(m.FuelType,''), 'Diesel') AS FinalFuelType,
            ISNULL(NULLIF(st.FuelUnit,''), 'Liters') AS FinalFuelUnit,
            LTRIM(RTRIM(ISNULL(NULLIF(m.RecordingUnit,''), 'Hours'))) AS FinalRecordingUnit,
            CASE
                WHEN LTRIM(RTRIM(ISNULL(NULLIF(m.RecordingUnit,''), 'Hours')))
                     IN ('Hours','Hour','HMR','Both','KMR/HMR')
                THEN 1 ELSE 0
            END AS UsesHMR,
            CASE
                WHEN LTRIM(RTRIM(ISNULL(NULLIF(m.RecordingUnit,''), 'Hours')))
                     IN ('Kilometer','Kilometers','KM','KMR','Both','KMR/HMR')
                THEN 1 ELSE 0
            END AS UsesKMR,
            ISNULL(NULLIF(b.ProjectID, 0), (
                SELECT TOP 1 ProjId
                FROM dbo.tbl_ProjAssetAllocation
                WHERE AssetId = b.AssetID
                  AND ISNULL(IsActive, 1) = 1
                  AND ReleaseDate IS NULL
                ORDER BY ProjAssetAllocId DESC
            )) AS FinalProjectID,
            ISNULL(NULLIF(b.OperatorID, 0), (
                SELECT TOP 1 UserId
                FROM dbo.tbl_AssetOpAllocation
                WHERE AssetId = b.AssetID
                  AND ISNULL(IsActive, 1) = 1
                  AND ReleaseDate IS NULL
                ORDER BY UserId DESC
            )) AS FinalOperatorID
        FROM @BulkItems b
        LEFT JOIN dbo.tbl_Asset ma
            ON ma.AssetId = b.AssetID
        LEFT JOIN dbo.mst_Model m
            ON m.ModelId = ma.ModelId
        LEFT JOIN dbo.mst_SubType st
            ON st.SubTypeId = ma.SubTypeId
    )
    SELECT *
    INTO #ResolvedBulkLogs
    FROM ResolvedRows;

    IF EXISTS (SELECT 1 FROM #ResolvedBulkLogs WHERE ISNULL(FinalProjectID, 0) = 0)
        RAISERROR('ProjectID not found for one or more assets.', 16, 1);

    IF EXISTS (SELECT 1 FROM #ResolvedBulkLogs WHERE ISNULL(FinalOperatorID, 0) = 0)
        RAISERROR('OperatorID is required in one or more rows.', 16, 1);

    IF ISNULL(@ScopeDeptId, 0) <> 0
    BEGIN
        IF EXISTS (
            SELECT 1
            FROM #ResolvedBulkLogs r
            INNER JOIN dbo.tbl_Asset a
                ON a.AssetId = r.AssetID
            WHERE ISNULL(a.DeptId, 0) <> @ScopeDeptId
        )
            RAISERROR('One or more assets are outside your assigned department.', 16, 1);
    END

    IF LTRIM(RTRIM(ISNULL(@AuthRoleName, ''))) = 'Operator'
    BEGIN
        IF EXISTS (
            SELECT 1
            FROM #ResolvedBulkLogs r
            WHERE r.FinalOperatorID <> @AuthUserId
        )
            RAISERROR('Operator can save bulk logs only for their own profile.', 16, 1);
    END

    IF EXISTS (
        SELECT 1
        FROM #ResolvedBulkLogs
        WHERE UsesHMR = 1
          AND StartHMR IS NULL
    )
        RAISERROR('StartHMR is required in one or more rows.', 16, 1);

    IF EXISTS (
        SELECT 1
        FROM #ResolvedBulkLogs
        WHERE UsesKMR = 1
          AND StartKMR IS NULL
    )
        RAISERROR('StartKMR is required in one or more rows.', 16, 1);

    IF EXISTS (
        SELECT 1
        FROM #ResolvedBulkLogs
        WHERE UsesHMR = 1
          AND EndHMR IS NULL
    )
        RAISERROR('EndHMR is required in one or more rows.', 16, 1);

    IF EXISTS (
        SELECT 1
        FROM #ResolvedBulkLogs
        WHERE UsesKMR = 1
          AND EndKMR IS NULL
    )
        RAISERROR('EndKMR is required in one or more rows.', 16, 1);

    IF EXISTS (
        SELECT 1
        FROM #ResolvedBulkLogs
        WHERE UsesHMR = 1
          AND EndHMR < StartHMR
    )
        RAISERROR('EndHMR cannot be less than StartHMR in one or more rows.', 16, 1);

    IF EXISTS (
        SELECT 1
        FROM #ResolvedBulkLogs
        WHERE UsesKMR = 1
          AND EndKMR < StartKMR
    )
        RAISERROR('EndKMR cannot be less than StartKMR in one or more rows.', 16, 1);

    BEGIN TRY
        BEGIN TRAN;

        INSERT INTO dbo.trn_DailyLog
        (
            UniqueId,
            LogDate,
            ProjId,
            AssetId,
            UserId,
            MachineStatus,
            LogType,
            LogStart,
            LogEnd,
            StartHMR,
            EndHMR,
            StartKMR,
            EndKMR,
            ProductionQty,
            WorkingHours,
            IsActive,
            SubmissionStatus,
            OperatorRemarks,
            CreatedBy,
            CreatedOn,
            EndHMRPhoto,
            EndKMRPhoto,
            RemarkPhotoPath,
            BreakdownReason
        )
        SELECT
            SUBSTRING(CONVERT(VARCHAR(50), NEWID()), 1, 8),
            LogDate,
            FinalProjectID,
            AssetID,
            FinalOperatorID,
            MachineStatus,
            'Working',
            StartDateTime,
            EndDateTime,
            CASE WHEN UsesHMR = 1 THEN StartHMR ELSE 0 END,
            CASE WHEN UsesHMR = 1 THEN EndHMR ELSE 0 END,
            CASE WHEN UsesKMR = 1 THEN StartKMR ELSE 0 END,
            CASE WHEN UsesKMR = 1 THEN EndKMR ELSE 0 END,
            ISNULL(OutputQty, 0),
            CASE 
                WHEN EndDateTime IS NOT NULL AND StartDateTime IS NOT NULL 
                    THEN DATEDIFF(MINUTE, StartDateTime, EndDateTime) / 60.0 
                ELSE 0 
            END,
            1,
            'Submitted',
            WorkingRemarks,
            CreatedBy,
            GETDATE(),
            NULLIF(EndReadingPhoto, ''),
            NULLIF(EndReadingPhoto, ''),
            NULLIF(RemarkPhoto, ''),
            ISNULL(BreakdownReason, '')
        FROM #ResolvedBulkLogs
        WHERE ISNULL(LogID, 0) = 0
        ORDER BY RowNo;

        INSERT INTO dbo.trn_FuelLog
        (
            FuelDateTime,
            ProjId,
            AssetId,
            UserId,
            FuelType,
            FuelUnit,
            FuelQty,
            ReadingAtFueling,
            Remarks,
            PhotoPath,
            IsActive,
            CreatedBy,
            CreatedOn
        )
        SELECT
            ISNULL(EndDateTime, StartDateTime),
            FinalProjectID,
            AssetID,
            FinalOperatorID,
            FinalFuelType,
            FinalFuelUnit,
            ISNULL(FuelQty, 0),
            CASE
                WHEN UsesKMR = 1 AND UsesHMR = 0 THEN EndKMR
                ELSE EndHMR
            END,
            ISNULL(WorkingRemarks, ''),
            NULL,
            1,
            CreatedBy,
            GETDATE()
        FROM #ResolvedBulkLogs
        WHERE ISNULL(LogID, 0) = 0
          AND ISNULL(FuelQty, 0) > 0;

        UPDATE dl
        SET
            dl.ProjId = r.FinalProjectID,
            dl.UserId = r.FinalOperatorID,
            dl.LogStart = r.StartDateTime,
            dl.StartHMR = CASE WHEN r.UsesHMR = 1 THEN r.StartHMR ELSE 0 END,
            dl.StartKMR = CASE WHEN r.UsesKMR = 1 THEN r.StartKMR ELSE 0 END,
            dl.LogEnd = r.EndDateTime,
            dl.EndHMR = CASE WHEN r.UsesHMR = 1 THEN r.EndHMR ELSE 0 END,
            dl.EndKMR = CASE WHEN r.UsesKMR = 1 THEN r.EndKMR ELSE 0 END,
            dl.MachineStatus = r.MachineStatus,
            dl.ProductionQty = ISNULL(r.OutputQty, 0),
            dl.WorkingHours = CASE 
                WHEN r.EndDateTime IS NOT NULL AND r.StartDateTime IS NOT NULL 
                    THEN DATEDIFF(MINUTE, r.StartDateTime, r.EndDateTime) / 60.0 
                ELSE 0 
            END,
            dl.OperatorRemarks = r.WorkingRemarks,
            dl.EndHMRPhoto = CASE WHEN NULLIF(r.EndReadingPhoto, '') IS NOT NULL THEN r.EndReadingPhoto ELSE dl.EndHMRPhoto END,
            dl.EndKMRPhoto = CASE WHEN NULLIF(r.EndReadingPhoto, '') IS NOT NULL THEN r.EndReadingPhoto ELSE dl.EndHMRPhoto END,
            dl.RemarkPhotoPath = CASE WHEN NULLIF(r.RemarkPhoto, '') IS NOT NULL THEN r.RemarkPhoto ELSE dl.RemarkPhotoPath END,
            dl.BreakdownReason = ISNULL(r.BreakdownReason, ''),
            dl.ModifiedBy = r.CreatedBy,
            dl.ModifiedOn = GETDATE()
        FROM dbo.trn_DailyLog dl
        INNER JOIN #ResolvedBulkLogs r
            ON dl.LogId = r.LogID
        WHERE ISNULL(r.LogID, 0) > 0;

        COMMIT TRAN;

        SELECT
            'Success' AS Status,
            CONCAT(COUNT(1), ' bulk log(s) saved successfully.') AS Msg
        FROM #ResolvedBulkLogs;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRAN;

        DECLARE @BulkErrorMsg NVARCHAR(4000) = ERROR_MESSAGE();
        RAISERROR(@BulkErrorMsg, 16, 1);
    END CATCH
END

ELSE IF(@Event='GetBulkLogDetails_4E965F53')
BEGIN
    IF ISNULL(@AuthUserId, 0) = 0
    BEGIN
        RAISERROR('Unauthorized access.', 16, 1);
        RETURN;
    END
    IF ISNULL(@AssetID, 0) = 0
    BEGIN
        RAISERROR('AssetID is required.', 16, 1);
        RETURN;
    END
    SELECT
        dl.LogId AS LogID,
        dl.AssetId AS AssetID,
        a.AssetName,
        a.PhotoPath,
        ISNULL(m.RecordingUnit, 'Hours') AS RecordingUnit,
        dl.ProjId AS ProjectID,
        p.ProjName,
        dl.UserId AS OperatorID,
        o.UserName AS OperatorName,
        dl.MachineStatus,
        dl.LogStart AS StartDateTime,
        dl.LogEnd AS EndDateTime,
        dl.StartHMR,
        dl.EndHMR,
        dl.StartKMR,
        dl.EndKMR,
        ISNULL(dl.WorkingHours, 0) AS TotalHours,
        dl.ProductionQty,
        ISNULL(m.OutputUnit, '') AS ProductionUnit,
        dl.OperatorRemarks AS Remarks,
        dl.BreakdownReason,
        0.0 AS IdleHours,
        0.0 AS BreakdownHours,
        ISNULL(fl.FuelQty, 0) AS FuelQty,
        dl.SubmissionStatus,
        dl.LogDate,
        dl.CreatedOn,
        0 AS LogVerificationStatus,
        NULL AS LogVerificationDate
    FROM dbo.trn_DailyLog dl
    LEFT JOIN dbo.tbl_Asset a ON a.AssetId = dl.AssetId
    LEFT JOIN dbo.mst_Model m ON m.ModelId = a.ModelId
    LEFT JOIN dbo.tbl_Project p ON p.ProjId = dl.ProjId
    LEFT JOIN dbo.tbl_User o ON o.UserId = dl.UserId
    OUTER APPLY
    (
        SELECT TOP 1 f.FuelQty
        FROM dbo.trn_FuelLog f
        WHERE f.AssetId = dl.AssetId
          AND ISNULL(f.IsActive, 1) = 1
          AND (
                (dl.LogEnd IS NOT NULL AND f.FuelDateTime = dl.LogEnd)
                OR
                (dl.LogEnd IS NULL AND f.FuelDateTime = dl.LogStart)
              )
        ORDER BY f.FuelLogId DESC
    ) fl
    WHERE dl.AssetId = @AssetID
      AND (NULLIF(@datefrom, '') IS NULL OR dl.LogStart >= CAST(@datefrom AS DATETIME))
    ORDER BY dl.LogStart, dl.LogId;
END


update tbl_AppLog set Status='Success', Reason = '', EndDate = getdate(), Event = @event, userids = @mis_session_userid, ExecutionTime = datediff(MILLISECOND,CreatedDate,getdate()) where Id=@newLogId
end try
begin catch
	update tbl_AppLog set Status='Error',Reason=cast(ERROR_MESSAGE() as nvarchar(max)),
	EndDate = getdate(), ExecutionTime = datediff(MILLISECOND,CreatedDate,getdate()) 
	where Id=@newLogId;
	
	
	select 'Error' 'Status',cast(ERROR_MESSAGE() as nvarchar(max)) 'Msg'
END CATCH
END