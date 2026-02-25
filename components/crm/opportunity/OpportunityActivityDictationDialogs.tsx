'use client'

import ConfirmDialog from '@/components/common/ConfirmDialog'
import AiVoiceVisualizer from '@/components/shared/AiVoiceVisualizer'

interface OpportunityActivityDictationDialogsProps {
  activityDictation: any
}

export default function OpportunityActivityDictationDialogs({
  activityDictation,
}: OpportunityActivityDictationDialogsProps) {
  return (
    <>
      {activityDictation.dialog.isOpen && (
        <ConfirmDialog
          isOpen={activityDictation.dialog.isOpen}
          title={activityDictation.dialog.mode === 'processing' ? 'Clasificando actividad' : 'Dictar Actividad'}
          message={(
            <div className="space-y-4 text-left">
              <AiVoiceVisualizer
                mode={activityDictation.dialog.mode === 'recording' ? 'listening' : 'processing'}
                className="mb-2"
              />

              {activityDictation.dialog.mode === 'recording' && (
                <>
                  <p className="text-sm text-gray-600 text-center">
                    Describa la actividad. La IA detectará si es una tarea o reunión y completará los campos:
                  </p>
                  <div className="rounded-lg border border-blue-100 bg-blue-50/60 p-3">
                    <ul className="list-disc pl-5 space-y-1 text-xs text-gray-700">
                      {activityDictation.dialog.items.map((item: { label: string; suggestion: string }) => (
                        <li key={`activity-guide-${item.label}`}>
                          <span className="font-semibold">{item.label}:</span> {item.suggestion}
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}

              {activityDictation.dialog.mode === 'processing' && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-indigo-700 text-center">
                    Clasificando la actividad y extrayendo los datos...
                  </p>
                  <p className="text-xs text-gray-500 text-center">
                    Esto puede tomar unos segundos.
                  </p>
                </div>
              )}

              {activityDictation.error && (
                <p className="text-xs text-red-600 text-center">{activityDictation.error}</p>
              )}
            </div>
          )}
          confirmText={activityDictation.dialog.mode === 'processing' ? 'Procesando...' : 'Detener dictado'}
          cancelText={activityDictation.dialog.mode === 'processing' ? '' : 'Ocultar guía'}
          confirmVariant="primary"
          loading={activityDictation.dialog.mode === 'processing'}
          loadingText="Procesando..."
          onConfirm={
            activityDictation.dialog.mode === 'processing'
              ? () => {}
              : activityDictation.handleDialogStop
          }
          onCancel={
            activityDictation.dialog.mode === 'processing'
              ? () => {}
              : activityDictation.handleDialogHide
          }
          zIndex={82}
        />
      )}

      {activityDictation.missingDialog.isOpen && (
        <ConfirmDialog
          isOpen={activityDictation.missingDialog.isOpen}
          title={
            activityDictation.missingDialog.mode === 'recording'
              ? 'Escuchando...'
              : activityDictation.missingDialog.mode === 'processing'
                ? 'Analizando...'
                : 'Verificación de Datos'
          }
          message={(
            <>
              {(activityDictation.missingDialog.mode === 'recording' || activityDictation.missingDialog.mode === 'processing') && (
                <div className="mb-4">
                  <AiVoiceVisualizer
                    mode={activityDictation.missingDialog.mode === 'recording' ? 'listening' : 'processing'}
                  />
                </div>
              )}

              {activityDictation.missingDialog.mode === 'recording' && (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600 text-center">
                    El micrófono está activo. Presione <span className="font-semibold">Detener</span> cuando haya finalizado.
                  </p>
                  {(activityDictation.missingDialog.missingRequired.length > 0 || activityDictation.missingDialog.notDetected.length > 0) && (
                    <div className="text-left space-y-2 bg-slate-50 p-3 rounded-lg border border-slate-100">
                      {activityDictation.missingDialog.missingRequired.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-rose-700 mb-1">Faltan para completar:</p>
                          <ul className="list-disc pl-5 space-y-0.5 text-xs text-gray-600">
                            {activityDictation.missingDialog.missingRequired.map((field: string) => (
                              <li key={`act-rec-missing-${field}`}>{field}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {activityDictation.missingDialog.notDetected.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-amber-700 mb-1">No detectados por IA:</p>
                          <ul className="list-disc pl-5 space-y-0.5 text-xs text-gray-600">
                            {activityDictation.missingDialog.notDetected.map((field: string) => (
                              <li key={`act-rec-notdet-${field}`}>{field}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {activityDictation.missingDialog.mode === 'processing' && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-indigo-700 text-center">
                    Procesando información adicional...
                  </p>
                  <p className="text-xs text-gray-500 text-center">
                    Esto puede tomar unos segundos.
                  </p>
                </div>
              )}

              {activityDictation.missingDialog.mode === 'missing' && (
                <div className="text-left space-y-3">
                  <p className="text-sm text-gray-600">
                    La IA ha completado la mayor parte, pero faltan algunos datos:
                  </p>
                  {activityDictation.missingDialog.missingRequired.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-700 mb-1">Faltan para completar:</p>
                      <ul className="list-disc pl-5 space-y-0.5 text-xs text-gray-600">
                        {activityDictation.missingDialog.missingRequired.map((field: string) => (
                          <li key={`act-missing-${field}`}>{field}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {activityDictation.missingDialog.notDetected.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-700 mb-1">No detectados por IA:</p>
                      <ul className="list-disc pl-5 space-y-0.5 text-xs text-gray-600">
                        {activityDictation.missingDialog.notDetected.map((field: string) => (
                          <li key={`act-notdet-${field}`}>{field}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <p className="text-xs text-gray-500">
                    Puede escribir estos datos en el formulario o volver a dictar.
                  </p>
                </div>
              )}

              {activityDictation.error && (
                <p className="mt-2 text-xs text-red-600 text-center">{activityDictation.error}</p>
              )}
            </>
          )}
          confirmText={
            activityDictation.missingDialog.mode === 'recording'
              ? 'Detener dictado'
              : activityDictation.missingDialog.mode === 'processing'
                ? 'Procesando...'
                : 'Dictar'
          }
          cancelText={
            activityDictation.missingDialog.mode === 'processing'
              ? ''
              : activityDictation.missingDialog.mode === 'recording'
                ? 'Completar manualmente'
                : 'Registrar manualmente'
          }
          confirmVariant="primary"
          loading={activityDictation.missingDialog.mode === 'processing'}
          loadingText="Procesando..."
          onConfirm={
            activityDictation.missingDialog.mode === 'recording'
              ? activityDictation.handleMissingStopDictation
              : activityDictation.missingDialog.mode === 'processing'
                ? () => {}
                : activityDictation.handleMissingDictate
          }
          onCancel={activityDictation.handleMissingManual}
          zIndex={84}
        />
      )}
    </>
  )
}
