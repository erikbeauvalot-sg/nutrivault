/**
 * Recipe Import Modal
 * 3-step modal for importing recipes from JSON file or URL
 * Step 1: Source selection (file dropzone or URL input)
 * Step 2: Preview + duplicate handling option (file only)
 * Step 3: Results summary
 */

import { useState, useCallback } from 'react';
import { Modal, Button, Alert, Badge, Form, Spinner, ListGroup, Nav } from 'react-bootstrap';
import { useDropzone } from 'react-dropzone';
import { useTranslation } from 'react-i18next';
import { FaFileImport, FaCheckCircle, FaExclamationTriangle, FaTimesCircle, FaLink, FaFile } from 'react-icons/fa';
import * as recipeService from '../services/recipeService';

const RecipeImportModal = ({ show, onHide, onSuccess }) => {
  const { t } = useTranslation();

  // Source mode: 'file' or 'url'
  const [sourceMode, setSourceMode] = useState('url');

  const [step, setStep] = useState(1);
  const [file, setFile] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [parseError, setParseError] = useState(null);
  const [duplicateHandling, setDuplicateHandling] = useState('skip');
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState(null);
  const [importError, setImportError] = useState(null);

  // URL import state
  const [urlValue, setUrlValue] = useState('');
  const [urlImporting, setUrlImporting] = useState(false);
  const [urlError, setUrlError] = useState(null);
  const [urlResults, setUrlResults] = useState(null);

  const reset = () => {
    setStep(1);
    setFile(null);
    setPreviewData(null);
    setParseError(null);
    setDuplicateHandling('skip');
    setImporting(false);
    setResults(null);
    setImportError(null);
    setUrlValue('');
    setUrlImporting(false);
    setUrlError(null);
    setUrlResults(null);
  };

  const handleClose = () => {
    reset();
    onHide();
  };

  const onDrop = useCallback(async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return;

    const selectedFile = acceptedFiles[0];
    setFile(selectedFile);
    setParseError(null);

    try {
      const data = await recipeService.previewImportFile(selectedFile);

      if (!data.version || data.type !== 'nutrivault-recipes' || !Array.isArray(data.recipes)) {
        setParseError(t('recipes.import.invalidFormat', 'Invalid file format. Expected a NutriVault recipes export file.'));
        return;
      }

      setPreviewData(data);
      setStep(2);
    } catch (err) {
      setParseError(t('recipes.import.parseError', 'Could not parse file. Please check it is valid JSON.'));
    }
  }, [t]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/json': ['.json'] },
    maxSize: 5 * 1024 * 1024,
    multiple: false
  });

  const handleImport = async () => {
    if (!file) return;

    setImporting(true);
    setImportError(null);

    try {
      const summary = await recipeService.importRecipesJSON(file, { duplicateHandling });
      setResults(summary);
      setStep(3);
      if (onSuccess) onSuccess();
    } catch (err) {
      setImportError(err.response?.data?.error || err.message || t('recipes.import.error', 'Import failed'));
    } finally {
      setImporting(false);
    }
  };

  const handleUrlImport = async () => {
    if (!urlValue.trim()) return;

    setUrlImporting(true);
    setUrlError(null);

    try {
      const summary = await recipeService.importFromUrl(urlValue.trim());
      setUrlResults(summary);
      setStep(3);
      if (onSuccess) onSuccess();
    } catch (err) {
      setUrlError(err.response?.data?.error || err.message || t('recipes.import.urlError', 'Failed to import from URL'));
    } finally {
      setUrlImporting(false);
    }
  };

  const handleUrlKeyDown = (e) => {
    if (e.key === 'Enter' && urlValue.trim() && !urlImporting) {
      e.preventDefault();
      handleUrlImport();
    }
  };

  // Gather unique category names and ingredient names from preview
  const getPreviewStats = () => {
    if (!previewData) return {};
    const recipes = previewData.recipes || [];
    const categories = new Set();
    const ingredients = new Set();

    recipes.forEach(r => {
      if (r.category) categories.add(r.category);
      if (r.ingredients) {
        r.ingredients.forEach(ing => {
          if (ing.name) ingredients.add(ing.name);
        });
      }
    });

    return {
      recipeCount: recipes.length,
      categoryCount: categories.size,
      ingredientCount: ingredients.size,
      categories: [...categories],
      ingredients: [...ingredients]
    };
  };

  const stats = getPreviewStats();

  // Get the active results (either from file import or URL import)
  const activeResults = results || urlResults;

  return (
    <Modal show={show} onHide={handleClose} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title>
          <FaFileImport className="me-2" />
          {t('recipes.import.title', 'Import Recipes')}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {/* Step 1: Source Selection */}
        {step === 1 && (
          <>
            {/* Source mode tabs */}
            <Nav variant="pills" className="mb-4 justify-content-center" activeKey={sourceMode} onSelect={setSourceMode}>
              <Nav.Item>
                <Nav.Link eventKey="url" className="d-flex align-items-center gap-2 px-4">
                  <FaLink />
                  {t('recipes.import.fromUrl', 'From URL')}
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="file" className="d-flex align-items-center gap-2 px-4">
                  <FaFile />
                  {t('recipes.import.fromFile', 'From file')}
                </Nav.Link>
              </Nav.Item>
            </Nav>

            {/* URL import mode */}
            {sourceMode === 'url' && (
              <>
                <div className="p-4 rounded-3" style={{ backgroundColor: 'var(--bs-light, #f8f9fa)', border: '2px solid var(--bs-border-color, #dee2e6)' }}>
                  <p className="mb-3 text-muted">
                    {t('recipes.import.urlDescription', 'Paste the URL of a recipe page. Most recipe websites include structured data that can be automatically imported.')}
                  </p>
                  <Form.Group>
                    <Form.Control
                      type="url"
                      placeholder={t('recipes.import.urlPlaceholder', 'https://www.example.com/recipe/...')}
                      value={urlValue}
                      onChange={(e) => setUrlValue(e.target.value)}
                      onKeyDown={handleUrlKeyDown}
                      disabled={urlImporting}
                      size="lg"
                      autoFocus
                    />
                  </Form.Group>
                  <Button
                    variant="primary"
                    className="mt-3 w-100"
                    onClick={handleUrlImport}
                    disabled={!urlValue.trim() || urlImporting}
                  >
                    {urlImporting ? (
                      <>
                        <Spinner animation="border" size="sm" className="me-2" />
                        {t('recipes.import.fetching', 'Fetching recipe...')}
                      </>
                    ) : (
                      <>
                        <FaLink className="me-2" />
                        {t('recipes.import.importUrl', 'Import from URL')}
                      </>
                    )}
                  </Button>
                </div>

                {urlError && (
                  <Alert variant="danger" className="mt-3 mb-0">
                    <FaTimesCircle className="me-2" />
                    {urlError}
                  </Alert>
                )}
              </>
            )}

            {/* File import mode */}
            {sourceMode === 'file' && (
              <>
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-3 p-5 text-center cursor-pointer ${isDragActive ? 'border-primary bg-light' : 'border-secondary'}`}
                  style={{ cursor: 'pointer', borderStyle: 'dashed', borderWidth: '2px' }}
                >
                  <input {...getInputProps()} />
                  <FaFileImport size={48} className="text-muted mb-3 d-block mx-auto" />
                  {isDragActive ? (
                    <p className="mb-0 text-primary fw-bold">
                      {t('recipes.import.dropHere', 'Drop the file here...')}
                    </p>
                  ) : (
                    <>
                      <p className="mb-1 fw-bold">
                        {t('recipes.import.dragOrClick', 'Drag & drop a JSON file here, or click to select')}
                      </p>
                      <p className="mb-0 text-muted small">
                        {t('recipes.import.fileReqs', '.json files only, max 5MB')}
                      </p>
                    </>
                  )}
                </div>

                {parseError && (
                  <Alert variant="danger" className="mt-3 mb-0">
                    <FaTimesCircle className="me-2" />
                    {parseError}
                  </Alert>
                )}
              </>
            )}
          </>
        )}

        {/* Step 2: Preview (file import only) */}
        {step === 2 && previewData && (
          <>
            <Alert variant="info">
              <strong>{t('recipes.import.preview', 'Preview')}</strong>
              {previewData.exportedBy && (
                <span className="ms-2 text-muted">
                  {t('recipes.import.exportedBy', 'Exported by {{name}}', { name: previewData.exportedBy })}
                </span>
              )}
            </Alert>

            <div className="d-flex gap-3 mb-4">
              <div className="text-center flex-fill p-3 bg-light rounded">
                <div className="fs-3 fw-bold text-primary">{stats.recipeCount}</div>
                <div className="small text-muted">{t('recipes.import.recipesCount', 'Recipes')}</div>
              </div>
              <div className="text-center flex-fill p-3 bg-light rounded">
                <div className="fs-3 fw-bold text-success">{stats.categoryCount}</div>
                <div className="small text-muted">{t('recipes.import.categoriesCount', 'Categories')}</div>
              </div>
              <div className="text-center flex-fill p-3 bg-light rounded">
                <div className="fs-3 fw-bold text-warning">{stats.ingredientCount}</div>
                <div className="small text-muted">{t('recipes.import.ingredientsCount', 'Ingredients')}</div>
              </div>
            </div>

            <ListGroup className="mb-3" style={{ maxHeight: '200px', overflowY: 'auto' }}>
              {previewData.recipes.map((recipe, i) => (
                <ListGroup.Item key={i} className="d-flex justify-content-between align-items-center">
                  <div>
                    <strong>{recipe.title}</strong>
                    {recipe.category && (
                      <Badge bg="secondary" className="ms-2">{recipe.category}</Badge>
                    )}
                  </div>
                  <Badge bg="outline-secondary" text="muted">
                    {recipe.ingredients?.length || 0} {t('recipes.import.ings', 'ing.')}
                  </Badge>
                </ListGroup.Item>
              ))}
            </ListGroup>

            <Form.Group className="mb-0">
              <Form.Label className="fw-bold">
                {t('recipes.import.duplicateHandling', 'If a recipe with the same title already exists:')}
              </Form.Label>
              <Form.Check
                type="radio"
                id="dup-skip"
                name="duplicateHandling"
                label={t('recipes.import.skip', 'Skip (do not import)')}
                value="skip"
                checked={duplicateHandling === 'skip'}
                onChange={() => setDuplicateHandling('skip')}
              />
              <Form.Check
                type="radio"
                id="dup-rename"
                name="duplicateHandling"
                label={t('recipes.import.rename', 'Rename and import (add "imported" suffix)')}
                value="rename"
                checked={duplicateHandling === 'rename'}
                onChange={() => setDuplicateHandling('rename')}
              />
            </Form.Group>

            {importError && (
              <Alert variant="danger" className="mt-3 mb-0">
                <FaTimesCircle className="me-2" />
                {importError}
              </Alert>
            )}
          </>
        )}

        {/* Step 3: Results */}
        {step === 3 && activeResults && (
          <>
            <Alert variant={(activeResults.errors?.length > 0) ? 'warning' : 'success'}>
              <FaCheckCircle className="me-2" />
              {t('recipes.import.complete', 'Import complete!')}
            </Alert>

            {/* URL import shows the recipe details */}
            {urlResults?.recipe && (
              <div className="mb-4 p-3 bg-light rounded">
                <h6 className="mb-2">{urlResults.recipe.title}</h6>
                {urlResults.recipe.description && (
                  <p className="text-muted small mb-2">{urlResults.recipe.description.substring(0, 200)}{urlResults.recipe.description.length > 200 ? '...' : ''}</p>
                )}
                <div className="d-flex flex-wrap gap-2">
                  {urlResults.recipe.prep_time_minutes && (
                    <Badge bg="info">{t('recipes.prepTime', 'Prep')}: {urlResults.recipe.prep_time_minutes} min</Badge>
                  )}
                  {urlResults.recipe.cook_time_minutes && (
                    <Badge bg="info">{t('recipes.cookTime', 'Cook')}: {urlResults.recipe.cook_time_minutes} min</Badge>
                  )}
                  {urlResults.recipe.servings && (
                    <Badge bg="secondary">{urlResults.recipe.servings} {t('recipes.servingsLabel', 'servings')}</Badge>
                  )}
                  {urlResults.recipe.ingredients?.length > 0 && (
                    <Badge bg="warning" text="dark">{urlResults.recipe.ingredients.length} {t('recipes.import.ingredientsCount', 'ingredients')}</Badge>
                  )}
                </div>
              </div>
            )}

            {/* File import stats */}
            {results && (
              <div className="d-flex gap-3 mb-4">
                <div className="text-center flex-fill p-3 bg-light rounded">
                  <div className="fs-3 fw-bold text-success">{results.created}</div>
                  <div className="small text-muted">{t('recipes.import.created', 'Created')}</div>
                </div>
                <div className="text-center flex-fill p-3 bg-light rounded">
                  <div className="fs-3 fw-bold text-secondary">{results.skipped}</div>
                  <div className="small text-muted">{t('recipes.import.skippedCount', 'Skipped')}</div>
                </div>
                <div className="text-center flex-fill p-3 bg-light rounded">
                  <div className="fs-3 fw-bold text-danger">{results.errors.length}</div>
                  <div className="small text-muted">{t('recipes.import.errorsCount', 'Errors')}</div>
                </div>
              </div>
            )}

            {activeResults.categoriesCreated?.length > 0 && (
              <div className="mb-3">
                <h6>{t('recipes.import.newCategories', 'New categories created:')}</h6>
                <div className="d-flex flex-wrap gap-1">
                  {activeResults.categoriesCreated.map((name, i) => (
                    <Badge key={i} bg="success">{name}</Badge>
                  ))}
                </div>
              </div>
            )}

            {activeResults.ingredientsCreated?.length > 0 && (
              <div className="mb-3">
                <h6>{t('recipes.import.newIngredients', 'New ingredients created:')}</h6>
                <div className="d-flex flex-wrap gap-1">
                  {activeResults.ingredientsCreated.map((name, i) => (
                    <Badge key={i} bg="warning" text="dark">{name}</Badge>
                  ))}
                </div>
              </div>
            )}

            {activeResults.errors?.length > 0 && (
              <div className="mb-0">
                <h6>{t('recipes.import.errorDetails', 'Errors:')}</h6>
                <ListGroup variant="flush">
                  {activeResults.errors.map((err, i) => (
                    <ListGroup.Item key={i} className="text-danger small px-0">
                      <FaExclamationTriangle className="me-1" />
                      <strong>{err.title}</strong>: {err.reason}
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              </div>
            )}
          </>
        )}
      </Modal.Body>

      <Modal.Footer>
        {step === 1 && (
          <Button variant="secondary" onClick={handleClose}>
            {t('common.cancel', 'Cancel')}
          </Button>
        )}
        {step === 2 && (
          <>
            <Button variant="secondary" onClick={() => { setStep(1); setFile(null); setPreviewData(null); }}>
              {t('common.back', 'Back')}
            </Button>
            <Button variant="primary" onClick={handleImport} disabled={importing}>
              {importing ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  {t('recipes.import.importing', 'Importing...')}
                </>
              ) : (
                t('recipes.import.startImport', 'Import Recipes')
              )}
            </Button>
          </>
        )}
        {step === 3 && (
          <Button variant="primary" onClick={handleClose}>
            {t('common.close', 'Close')}
          </Button>
        )}
      </Modal.Footer>
    </Modal>
  );
};

export default RecipeImportModal;
