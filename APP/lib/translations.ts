export const translations = {
    es: {
        // Authentication
        auth: {
            login: 'Iniciar Sesión',
            logout: 'Cerrar Sesión',
            rut: 'RUT',
            password: 'Contraseña',
            register: 'Registrar',
            forgotPassword: '¿Olvidaste tu contraseña?',
        },
        // Professional
        professional: {
            title: 'Profesionales',
            myPatients: 'Mis Pacientes',
            patients: 'Pacientes',
            searchByRUT: 'Buscar por RUT',
            filterByState: 'Filtrar por Estado',
            allStates: 'Todos',
            noPatients: 'No hay pacientes',
            noPatientsDesc:
                'Los pacientes aparecerán aquí cuando sean asignados',
            noControl30Days: 'Sin control > 30 días',
            recentControls: 'Controles recientes',
            registerAttention: 'Registrar Atención',
        },
        // Patient
        patient: {
            title: 'Paciente',
            name: 'Nombre',
            rut: 'RUT',
            sex: 'Sexo',
            birthDate: 'Fecha de Nacimiento',
            admissionDate: 'Fecha de Ingreso',
            comments: 'Comentarios',
            state: 'Estado',
            lastControl: 'Último Control',
        },
        // Patient States
        patientStates: {
            en_tratamiento: 'En Tratamiento',
            alta: 'Alta',
            interrumpido: 'Interrumpido',
            inactivo: 'Inactivo',
        },
        // Images
        images: {
            title: 'Imágenes',
            upload: 'Subir Imagen',
            noImages: 'No hay imágenes',
            takePhoto: 'Tomar Foto',
            selectFromGallery: 'Seleccionar de Galería',
            preview: 'Vista Previa',
            save: 'Guardar',
            cancel: 'Cancelar',
        },
        // Consultation
        consultation: {
            title: 'Consulta',
            date: 'Fecha',
            notes: 'Notas',
            diagnosis: 'Diagnóstico',
            treatment: 'Tratamiento',
        },
        // Camera
        camera: {
            title: 'Cámara',
            takePhoto: 'Tomar Foto',
            retake: 'Volver a Tomar',
            use: 'Usar Foto',
        },
        // Editor
        editor: {
            title: 'Editor',
            draw: 'Dibujar',
            erase: 'Borrar',
            clear: 'Limpiar',
            undo: 'Deshacer',
            save: 'Guardar',
        },
        // PWAT Score
        pwat: {
            title: 'Puntuación PWAT',
            patientState: 'Estado del Paciente',
            total: 'Total',
            category: 'Categoría',
            score: 'Puntuación',
            evaluate: 'Evaluar',
            save: 'Guardar Evaluación',
        },
        // Common
        common: {
            save: 'Guardar',
            cancel: 'Cancelar',
            delete: 'Eliminar',
            edit: 'Editar',
            confirm: 'Confirmar',
            back: 'Volver',
            next: 'Siguiente',
            previous: 'Anterior',
            close: 'Cerrar',
            loading: 'Cargando',
            error: 'Error',
            success: 'Éxito',
            yes: 'Sí',
            no: 'No',
            search: 'Buscar',
            professionals: 'Profesionales',
        },
        // Errors
        errors: {
            generic: 'Ha ocurrido un error',
            network: 'Error de conexión',
            notFound: 'No encontrado',
            unauthorized: 'No autorizado',
            invalidData: 'Datos inválidos',
        },
    },
    en: {
        // Authentication
        auth: {
            login: 'Login',
            logout: 'Logout',
            rut: 'ID',
            password: 'Password',
            register: 'Register',
            forgotPassword: 'Forgot your password?',
        },
        // Professional
        professional: {
            title: 'Professionals',
            myPatients: 'My Patients',
            patients: 'Patients',
            searchByRUT: 'Search by ID',
            filterByState: 'Filter by State',
            allStates: 'All',
            noPatients: 'No patients',
            noPatientsDesc: 'Patients will appear here when assigned',
            noControl30Days: 'No control > 30 days',
            recentControls: 'Recent controls',
            registerAttention: 'Register Attention',
        },
        // Patient
        patient: {
            title: 'Patient',
            name: 'Name',
            rut: 'ID',
            sex: 'Sex',
            birthDate: 'Birth Date',
            admissionDate: 'Admission Date',
            comments: 'Comments',
            state: 'State',
            lastControl: 'Last Control',
        },
        // Patient States
        patientStates: {
            en_tratamiento: 'In Treatment',
            alta: 'Discharged',
            interrumpido: 'Interrupted',
            inactivo: 'Inactive',
        },
        // Images
        images: {
            title: 'Images',
            upload: 'Upload Image',
            noImages: 'No images',
            takePhoto: 'Take Photo',
            selectFromGallery: 'Select from Gallery',
            preview: 'Preview',
            save: 'Save',
            cancel: 'Cancel',
        },
        // Consultation
        consultation: {
            title: 'Consultation',
            date: 'Date',
            notes: 'Notes',
            diagnosis: 'Diagnosis',
            treatment: 'Treatment',
        },
        // Camera
        camera: {
            title: 'Camera',
            takePhoto: 'Take Photo',
            retake: 'Retake',
            use: 'Use Photo',
        },
        // Editor
        editor: {
            title: 'Editor',
            draw: 'Draw',
            erase: 'Erase',
            clear: 'Clear',
            undo: 'Undo',
            save: 'Save',
        },
        // PWAT Score
        pwat: {
            title: 'PWAT Score',
            patientState: 'Patient State',
            total: 'Total',
            category: 'Category',
            score: 'Score',
            evaluate: 'Evaluate',
            save: 'Save Evaluation',
        },
        // Common
        common: {
            save: 'Save',
            cancel: 'Cancel',
            delete: 'Delete',
            edit: 'Edit',
            confirm: 'Confirm',
            back: 'Back',
            next: 'Next',
            previous: 'Previous',
            close: 'Close',
            loading: 'Loading',
            error: 'Error',
            success: 'Success',
            yes: 'Yes',
            no: 'No',
            search: 'Search',
            professionals: 'Professionals',
        },
        // Errors
        errors: {
            generic: 'An error occurred',
            network: 'Connection error',
            notFound: 'Not found',
            unauthorized: 'Unauthorized',
            invalidData: 'Invalid data',
        },
    },
} as const;

export type TranslationKeys = typeof translations.es;
