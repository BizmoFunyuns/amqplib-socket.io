(define (domain OIL)
(:requirements :typing :durative-actions :fluents :duration-inequalities)

; UNITS
; Distances are in meters
; Durations are minutes

; "Private" predicates (i.e. internal to the planner) are prefixed with _


(:types rpmsetting
	wobsetting
	formation
	_standC      ; Stand number, mainly used to restrict search space
        steeringDemand
	)


(:predicates (rpm ?s - rpmsetting) (wob ?w - wobsetting)
             (_free)
             (_GEOvalid_ROP ?s - rpmsetting ?f - formation ?w - wobsetting) ; ROP valid for drilling
	     (_GEOvalid_MUD ?f - formation)   ; mud valid for drilling
	     (_GEOvalid_CAL ?s - rpmsetting)  ; RPM valid for calibration
             (_GEOvalid_RRM ?s - rpmsetting)  ; RPM valid for reaming
	     (atTarget)
	     (endFormation)
	     (dirty)
	     (_clean)
	     (_gotStand ?c - _standC )
	     (offBottom ?c - _standC)
	     (onBottom ?c - _standC)
	     (pumpsOn)
	     (pumpsOff)
	     (mudflow)

	     (slipsOn)
	     (slipsOff)
	     (drilledStand ?c - _standC)
	     (drillStringFree)
	     (atStickUpPoint)
	     (WoBCalibrated ?c - _standC)
	     
	     (haveValidSurvey ?c - _standC)
	     
	     (currentStand ?c - _standC)
	     (_nextStand ?c1 ?c2 - _standC)

	     (_upcomingSteeringDemand ?d - steeringDemand)
	     (_nextSteeringDemand ?d ?nd - steeringDemand)
	     (autoSteerIsHappy)
	     (_DDXIsHappy)
)

(:functions     (holeDepth)
		(rop ?s - rpmsetting ?f - formation ?w - wobsetting)
		(layerdepth ?f - formation)
		(connectionDepth)
		(targetDepth)
		(cleaningTime)
		(cleanStartTime)
		(pumpRamp)
		(standLength)
		(makeConnectionTime)
                (_standsDrilled)

		(steeringDemandDepth ?d - steeringDemand)
)

(:constants w0 - wobsetting r0 - rpmsetting)


;; Notice that we have given the planner information about context, by
;; threading the "_standC" parameter through the main actions and predicates.
;; This allows the planner to be aware of which stand it is in, which avoids 
;; search over other stands. The current mechanism is to identify a number of 
;; stands in the initial state, linked by _nextStand relations. This means that 
;; you can only drill as many stands as named in the initial state, minus one. 


(:durative-action drillToClean ; Drill until you have to clean
:parameters (?f - formation ?s ?os - rpmsetting ?wob ?owob - wobsetting ?c - _standC)
:duration (= ?duration (cleanStartTime))
:condition (and
	    (at start (currentStand ?c))
            (at start (SlipsOff))
	    (at start (_free))
            (at start (< (cleanStartTime)(/ (- (layerdepth ?f) (holeDepth)) (rop ?s ?f ?wob))))
	    (at start (< (cleanStartTime) (/ (- (connectionDepth) (holeDepth)) (rop ?s ?f ?wob))))
	    (at start (rpm ?os))
	    (at start (wob ?owob))
	    (at start (_GEOvalid_MUD ?f))
	    (at start (_GEOvalid_ROP ?s ?f ?wob))
	    (at start (_gotStand ?c))
	    (at start (onBottom ?c))
	    (over all (onBottom ?c))
	    (over all (pumpsOn))
	    (at start (drillStringFree))
	    )
:effect (and
	 (at start (not (rpm ?os)))
	 (at start (rpm ?s))
	 (at start (not (wob ?owob)))
	 (at start (wob ?wob))
	 (at start (not (_free)))
	 (at end (dirty))
	 (increase (holeDepth) (*  #t (rop ?s ?f ?wob)))
	 (at end (not (_clean)))
	 )
)

(:durative-action drillToConnection ; Drill until reach connection (aka until the end of the stand)
:parameters (?f - formation ?rs ?ors - rpmsetting ?wob ?owob - wobsetting ?d - steeringDemand ?c ?cn - _standC)
:duration
	 (= ?duration (/ (- (connectionDepth) (holeDepth)) (rop ?rs ?f ?wob)))
:condition (and (at start (haveValidSurvey ?c))
		(at start (currentStand ?c))
		(at start (_nextStand ?c ?cn))
		(at start (slipsOff))
		(at start (_free))
		(at start (<= (/ (- (connectionDepth) (holeDepth)) (rop ?rs ?f ?wob)) (cleanStartTime)))
		(at start (<= (connectionDepth) (layerDepth ?f))) 
	   	(at start (< (connectionDepth) (targetDepth)))

                (at start (_upcomingSteeringDemand ?d))
		(at start (< (connectionDepth) (steeringDemandDepth ?d)))

		(at start (rpm ?ors))
		(at start (wob ?owob))
		(at start (_GEOvalid_MUD ?f))
		(at start (_GEOvalid_ROP ?rs ?f ?wob))
		(at start (_gotStand ?c))
		(at start (onBottom ?c))
		(at start (pumpsOn))
		(over all (onBottom ?c))
		(over all (pumpsOn))
		(at start (drillStringFree))
		)
:effect (and
		(at start (not (rpm ?ors)))
		(at start (not (wob ?owob)))
		(at start (rpm ?rs))
		(at start (wob ?wob))
		(at start (not (_free))) 
		(at end (_free))
		(increase (holeDepth) (* #t (rop ?rs ?f ?wob)))
		(at end (drilledStand ?c))
		(at end (assign (_standsDrilled) (+ (_standsDrilled) 1)))
		(at end (not (_clean)))
		(at end (not (currentStand ?c)))
		(at end (currentStand ?cn))
		(at end (not (drillStringFree)))
	)
)


(:durative-action drillToSteeringDemand ; Drill until next steering demand
:parameters (?f - formation ?rs ?ors - rpmsetting ?wob ?owob - wobsetting ?d ?od - steeringDemand ?c - _standC)
:duration
	 (= ?duration (/ (- (steeringDemandDepth ?od) (holeDepth)) (rop ?rs ?f ?wob)))
:condition (and (at start (haveValidSurvey ?c))
		(at start (currentStand ?c))
		(at start (slipsOff))
	        (at start (_free))
		(at start (<= (/ (- (connectionDepth) (holeDepth)) (rop ?rs ?f ?wob)) (cleanStartTime)))
		(at start (<= (connectionDepth) (layerDepth ?f))) 
	   	(at start (< (connectionDepth) (targetDepth)))
		
		(at start (_nextSteeringDemand ?od ?d))
                (at start (_upcomingSteeringDemand ?od))

		(at start (rpm ?ors))
		(at start (wob ?owob))
		(at start (_GEOvalid_MUD ?f))
		(at start (_GEOvalid_ROP ?rs ?f ?wob))
		(at start (_gotStand ?c))
		(at start (onBottom ?c))
		(over all (onBottom ?c))
		(at start (pumpsOn))
		(over all (pumpsOn))
		(at start (drillStringFree))
		(at start (autoSteerIsHappy))
		)
:effect (and
		(at start (not (rpm ?ors)))
		(at start (not (wob ?owob)))
		
		(at end (_upcomingSteeringDemand ?d))
		(at start (not (_upcomingSteeringDemand ?od)))
		(at end (not (autoSteerIsHappy)))
		(at end (not (haveValidSurvey ?c)))
		(at start (rpm ?rs))
		(at start (wob ?wob))
		(at start (not (_free))) (at end (_free))
		(increase (holeDepth) (* #t (rop ?rs ?f ?wob)))
	)
)




(:durative-action cleanBore
:parameters ()
:duration (= ?duration (cleaningTime))
:condition (and (at start (dirty))
		)
:effect (and (at start (not (dirty)))
	     (at end (_free))
	     )
)

(:durative-action drillToFormation ; Drill until you reach the next formation
:parameters (?f - formation ?s - rpmsetting ?wob - wobsetting ?c - _standC)
:duration (= ?duration (/ (- (layerdepth ?f) (holeDepth)) (rop ?s ?f ?wob)))
:condition (and (at start (_free))
		(at start (<= (/ (- (layerdepth ?f) (holeDepth)) (rop ?s ?f ?wob)) (cleanStartTime)))
	   	(at start (< (layerdepth ?f) (targetDepth)))
		(at start (< (layerdepth ?f) (connectionDepth)))
		(at start (rpm ?s))
		(at start (wob ?wob))
		(at start (_GEOvalid_MUD ?f))
		(at start (_GEOvalid_ROP ?s ?f ?wob))
		(at start (_gotStand ?c))
		(at start (onBottom ?c))
		(over all (onBottom ?c))
		(at start (pumpsOn))
		(over all (pumpsOn))
		)
:effect (and (at start (not (_free)))
	     (at end (endFormation))
	     (at end (assign (holeDepth) (layerdepth ?f)))
	     )
)

(:durative-action drillToGoal ; Drill until you reach the final target
:parameters (?f - formation ?s ?os - rpmsetting ?wob ?owob - wobsetting ?c - _standC)
:duration (= ?duration (/ (- (targetDepth) (holeDepth)) (rop ?s ?f ?wob)))
:condition (and 
		(at start (currentStand ?c))
		(at start (slipsOff))
		(at start (_free))
	   	(at start (<= (targetDepth) (layerdepth ?f))) 
		(at start (<= (targetDepth) (connectionDepth)))
		(at start (<= (/ (- (targetDepth ) (holeDepth)) (rop ?s ?f ?wob)) (cleanStartTime)))
		(at start (rpm ?os))
		(at start (wob ?owob))
		(at start (_GEOvalid_MUD ?f))
		(at start (_GEOvalid_ROP ?s ?f ?wob))
		(at start (_gotStand ?c))
		(at start (onBottom ?c))
		(over all (onBottom ?c))
		(at start (pumpsOn))
		(over all (pumpsOn))
		(at start (drillStringFree))
	   )
:effect (and 
		(at start (not (rpm ?os)))
		(at start (not (wob ?owob)))
		(at start (rpm ?s))
		(at start (wob ?wob))
		(at start (not (_free))) 
		(at end (_free)) 
		(at end (atTarget))
		(increase (holeDepth) (* #t (rop ?s ?f ?wob)))
	)
)

;; The reason that reamUpAndDown requires 2 _standC parameters is because it
;; always happens after drillToConnection, which changes the current stand but 
;; the cleaning is for the stand just drilled.

(:durative-action reamUpAndDown
 :parameters (?s ?os - rpmsetting ?c ?cn - _standC)
 :duration (= ?duration (cleaningtime))
 :condition (and (at start (currentStand ?cn))
		 (at start (_nextStand ?c ?cn))
		 (at start (slipsOff))
		 (at start (onBottom ?c))
		 (at start (pumpsOn))
		 (over all (pumpsOn))
		 (at start (rpm ?os))
		 (at start (_GEOvalid_RRM ?s))
		 )
 :effect (and (at end (_clean))
	      (at start (not (_free)))
	      (at end (_free))
	      (at start (rpm ?s))
	      (at start (not(rpm ?os))))
)

;; ConnectPipe manages the completion of the transition between stands, so also
;; needs 2 _standC parameters.

(:durative-action connectPipe
 :parameters ( ?c ?cn - _standC)
 :duration (= ?duration (makeConnectionTime))
 :condition (and (at start (currentStand ?cn))
		 (at start (_nextStand ?c ?cn))
		 (at start (slipsOn))
		 (over all (slipsOn))
		 (at start (drilledStand ?c))
		 (over all (offBottom ?cn))
		 (at start (offBottom ?cn))
		 (over all (pumpsOff))
		 (at start (pumpsOff))
		 (over all (atStickUpPoint))
		 (at start (atStickUpPoint))
		 )
 :effect (and 
		(at start (increase (connectionDepth) (standLength)))
	  	(at end (_gotStand ?cn))
		(at end (not (atStickupPoint)))
         )
)

;; ComeOffBottom also happens at the end of one stand and before the next, so
;; requires both _standC parameters. This has to be improved if we want to be
;; able to come off bottom mid-stand. At the moment this will not be possible.

(:durative-action comeOffBottom
 :parameters (?w - wobsetting ?c ?cn - _standC)
 :duration (= ?duration 1)
 :condition (and
	     (at start (currentStand ?cn))
	     (at start (onBottom ?c))
	     (at start (wob ?w))
	     (at start (_free))
	     (at start (pumpsOn))
	     )
 :effect (and (at end (offBottom ?cn))
              (at start (not (onBottom ?c)))
              (at start (not (wob ?w)))
              (at end (wob w0))
	      )
)

; Get mud flowing back
; http://www.glossary.oilfield.slb.com/en/Terms.aspx?LookIn=term%20name&filter=break%20circulation

(:durative-action breakCirculation
:parameters ()
:duration (= ?duration (pumpRamp))
:condition (and (at start (pumpsOff))
		(over all (slipsOff))
		(at start (slipsOff)))
:effect (and (at end (pumpsOn))
	     (at end (mudflow))
	     (at start (not (pumpsOff))))
)


(:durative-action goOnBottom
 :parameters (?c - _standC)
 :duration (= ?duration 1)
 :condition (and
	     (at start (currentStand ?c))
	     (at start (pumpsOn))
	     (over all (pumpsOn))
	     (at start (SlipsOff))
	     (at start (offBottom ?c))
	     (at start (_gotStand ?c))
	     (at start (mudflow))
	     (at start (_free))
	     (at start (WoBCalibrated ?c)))
 :effect (and
	  (at end (onBottom ?c))
	  (at start (not (offBottom ?c)))
	  )
)

(:durative-action comeOffBottomToStickUpPoint
 :parameters (?w - wobsetting ?s - rpmsetting ?c ?cn - _standC)
 :duration (= ?duration 1)
 :condition (and
	     (at start (currentStand ?cn))
	     (at start (_nextStand ?c ?cn))
	     (at start (onBottom ?c))
	     (at start (wob ?w))
	     (at start (rpm ?s))
	     (at start (pumpsOn))
	     (at start (drilledStand ?c))
	     (at start (_clean))
	     )
 :effect (and (at end (offBottom ?cn))
              (at start (not (onBottom ?c)))
              (at start (not (wob ?w)))
              (at end (wob w0))
	      (at end (not (rpm ?s)))
              (at end (rpm r0))
	      (at end (atStickUpPoint))
	)
)

(:durative-action takeSurveyOffBottom
 :parameters (?c - _standC)
 :duration (= ?duration 10)
 :condition (and (at start (currentStand ?c))
	         (at start (slipsOff))
		 (over all (slipsOff))
	         (at start (offBottom ?c))
		 (over all (offBottom ?c))
		 (at start (_gotStand ?c))
		 (at start (mudflow))
		 (over all (mudflow))
		 (at start (rpm r0))
		 (over all (rpm r0))
	     )
 :effect (and (at end (haveValidSurvey ?c)))
 )

(:durative-action sendSteeringDemand
 :parameters (?c - _standC ?currentDemand ?nextDemand - steeringDemand)
 :duration (= ?duration 10)
 :condition (and (at start (_upcomingSteeringDemand ?currentDemand))
		 (at start (_nextSteeringDemand ?currentDemand ?nextDemand))
		 (at start (mudflow))
		 (over all (mudflow))
		 (at start (offBottom ?c))
		 (over all (offBottom ?c))
		 (at start (haveValidSurvey ?c))
		 )
 :effect (and (at end (autoSteerIsHappy))
	      (at end (_DDXIsHappy))
		)
 )

(:durative-action comeOffBottomToTakeSurvey
 :parameters (?r - rpmsetting ?w - wobsetting ?c - _standC)
 :duration (= ?duration 1)
 :condition (and (at start (currentStand ?c))
		 (at start (onBottom ?c))
                 (at start (wob ?w))
		 (at start (rpm ?r))
                 (at start (pumpsOn)))
 :effect (and (at end (offBottom ?c))
              (at start (not (onBottom ?c)))
              (at end (not (wob ?w)))
              (at end (wob w0))
	      (at end (not (rpm ?r)))
              (at end (rpm r0))
	      )
)

(:durative-action verifyFreeDrillString
 :parameters ()
 :duration (= ?duration 1)
 :condition (and (at start (slipsOff))
                 (at start (rpm r0))
		 )
 :effect (and (at end (drillStringFree))
	      )
)

(:durative-action calibrateWeightOnBit
 :parameters (?s ?os - rpmsetting ?c - _standC)
 :duration (= ?duration 0.5)
 :condition (and (at start (_GEOvalid_CAL ?s))
                 (at start (offBottom ?c))
	         (at start (pumpsOn))
		 (at start (drillStringFree))
		 (at start (slipsOff))
		 (at start (rpm ?os))
		 )
 :effect (and (at end (WoBCalibrated ?c))
	      (at end (rpm ?s))
	      (at end (not (rpm ?os))))
)
			       
 
(:durative-action turnOffPumps
 :parameters ()
 :duration (= ?duration 0.5)
 :condition (at start (pumpsOn))
 :effect (and
	  (at end (not (mudflow)))
	  (at start (not (pumpsOn)))
	  (at end (pumpsOff))
	  )
)

(:durative-action getInSlips
 :parameters ()
 :duration (= ?duration 0.5)
 :condition (and (over all (atStickUpPoint))
 		 (at start (atStickUpPoint))
		 (at start (slipsOff))
		 (at start (rpm r0))
		 (over all (rpm r0))
		    )
 :effect (and (at start (not (slipsOff)))
	      (at end (slipsOn))
	)
)

(:durative-action getOutOfSlips
 :parameters ()
 :duration (= ?duration 0.5)
 :condition (at start (slipsOn))
 :effect (and (at start (not (slipsOn)))
	      (at end (slipsOff))
	 )
)

)