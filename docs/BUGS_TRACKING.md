# BUGS / Issues tracking : 

- [X] Pour 1 Visite, je ne peux pas modifier une mesure. car les données sauvegarder ne se charge pas dans le formulaire de modification. On ne peut que rajouter des nouvelles mesures, ce qui crée des doublons et n'est pas bon.
- [X] Dans la section "Mesures", lorsque l'on visionne les donnée d'un mesure. En tant qu'admin, je dois pouvoir supprimer ou modifier une mesure. Actuellement, je ne peux pas.
- [X] Sur les custonField, si un catégory est presente sur le patient et sur la visite. les données ne sont pas visible entre les 2 alors que cela doit etre la meme donnée     
  qui doit etre accessible a la fois depuis le patient et depuis la visite. Mais on doit bien avoir la meme donnée. 
- [X] Échec de la mise à jour du patient: Genre: Invalid option selected
- [X] Rajouter lors de l'edition d'un patient, en plus du bouton 'enregistrer' un bouton 'enregistrer et sortir' qui permet d'enregistrer et de revenir a la liste des patients.
- [X] modifier le bouton 'Enregistrer les modifications' en 'enregistrer' pour plus de clarté.
- [X] le caclul automatique des mesures ne fonctionne pas. Je pense que c'est a cause des timeseries des mesures et donc difficile d'en creer une serie aussi. Dans un premier temps peut on creer des customField de type 'calculé' qui utilise les mesures en prenant a chaque fois la dernier valeur disponible pour faire le calcul ? Cela doit permettre de caculer l'indice de masse corporelle par exemple ou l'age.

- [ ] dans les mesure ou customfield de type 'calculed' la chaine des deendance devrait nous donner une alerte si une des variables n'est pas encore disponible.

- [ ] Suppression d'un type de mesure ne fonctionne pas : pas d'erreur mais le type de mesure reste présente.

- Remplacer tous les appels 'windows.alert' par des modales plus jolies.

